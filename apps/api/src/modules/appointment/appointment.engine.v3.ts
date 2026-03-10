import { 
  CreateAppointmentData, 
  UpdateAppointmentData, 
  RescheduleAppointmentData, 
  ManualBookingData,
  AppointmentStatus,
  StatusTransition,
  AppointmentConflict,
  BookingAttempt,
  createAppointmentSchema,
  updateAppointmentSchema,
  rescheduleAppointmentSchema,
  manualBookingSchema
} from './appointment.schema';
import { prisma } from '../../lib/prisma';

export class AppointmentEngine {
  private metrics = {
    totalBookings: 0,
    successfulBookings: 0,
    failedBookings: 0,
    concurrentBookings: 0,
    averageBookingTime: 0,
    lockExpirations: 0,
    reschedules: 0,
    cancellations: 0,
    noShows: 0,
    lastReset: new Date().toISOString(),
  };

  // Main appointment creation with slot locking
  async createAppointment(data: CreateAppointmentData): Promise<any> {
    const startTime = Date.now();
    this.metrics.totalBookings++;
    this.metrics.concurrentBookings++;

    try {
      // Validate request data
      const validated = createAppointmentSchema.parse(data);
      
      // Generate unique reference ID
      const referenceId = this.generateReferenceId();
      
      // Check for conflicts before creating lock
      const conflictCheck = await this.checkAppointmentConflict(
        validated.staffId,
        validated.startTimeUtc,
        validated.endTimeUtc,
        null // Exclude current appointment ID
      );

      if (conflictCheck.hasConflict) {
        throw new Error('Time slot is not available');
      }

      // Create slot lock
      const lock = await this.createSlotLock({
        staffId: validated.staffId,
        serviceId: validated.serviceId,
        customerId: validated.customerId,
        startTimeUtc: validated.startTimeUtc,
        endTimeUtc: validated.endTimeUtc,
        lockType: 'BOOKING',
        createdBy: validated.createdBy,
      });

      // Create appointment within transaction
      const appointment = await prisma.$transaction(async (tx) => {
        // Verify lock is still valid
        const lockExists = await tx.slotLock.findUnique({
          where: { id: lock.id },
        });

        if (!lockExists || new Date(lockExists.expiresAt) < new Date()) {
          throw new Error('Slot lock expired or not found');
        }

        // Create appointment
        const newAppointment = await tx.appointment.create({
          data: {
            staffId: validated.staffId,
            serviceId: validated.serviceId,
            customerId: validated.customerId,
            notes: validated.notes,
            requiresConfirmation: validated.requiresConfirmation,
            createdBy: validated.createdBy,
            startTimeUtc: new Date(validated.startTimeUtc),
            endTimeUtc: new Date(validated.endTimeUtc),
            referenceId,
            tenantId: await this.getTenantId(validated.staffId),
          },
        });

        // Update lock to reference appointment
        await tx.slotLock.update({
          where: { id: lock.id },
          data: { 
            appointmentId: newAppointment.id,
          },
        });

        return newAppointment;
      });

      // Update metrics
      this.metrics.successfulBookings++;
      const bookingTime = Date.now() - startTime;
      this.updateAverageBookingTime(bookingTime);

      return {
        ...appointment,
        referenceId,
        lockId: lock.id,
      };

    } catch (error) {
      this.metrics.failedBookings++;
      throw error;
    } finally {
      this.metrics.concurrentBookings--;
    }
  }

  // Update appointment with status lifecycle enforcement
  async updateAppointment(
    appointmentId: string, 
    data: UpdateAppointmentData
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate request data
      const validated = updateAppointmentSchema.parse(data);
      
      // Get current appointment
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }

      // Validate status transition
      const transition = this.validateStatusTransition(
        currentAppointment.status as AppointmentStatus,
        validated.status
      );

      if (!transition.allowed) {
        throw new Error(`Invalid status transition: ${currentAppointment.status} -> ${validated.status}`);
      }

      // Update appointment within transaction
      const updatedAppointment = await prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            ...validated,
            ...(validated.startTimeUtc && { startTimeUtc: new Date(validated.startTimeUtc) }),
            ...(validated.endTimeUtc && { endTimeUtc: new Date(validated.endTimeUtc) }),
            ...(validated.status && { status: validated.status as any }),
            updatedAt: new Date(),
            // Add timestamps for status changes
            ...(validated.status === AppointmentStatus.CONFIRMED && { confirmedAt: new Date() }),
            ...(validated.status === AppointmentStatus.CANCELLED && { cancelledAt: new Date() }),
            ...(validated.status === AppointmentStatus.COMPLETED && { completedAt: new Date() }),
          },
        });

        // Update metrics based on status change
        if (validated.status === AppointmentStatus.CANCELLED) {
          this.metrics.cancellations++;
        } else if (validated.status === AppointmentStatus.NO_SHOW) {
          this.metrics.noShows++;
        }

        return updated;
      });

      return updatedAppointment;

    } catch (error) {
      throw error;
    }
  }

  // Reschedule appointment with conflict detection
  async rescheduleAppointment(data: RescheduleAppointmentData): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate request data
      const validated = rescheduleAppointmentSchema.parse(data);
      
      // Get current appointment
      const currentAppointment = await prisma.appointment.findUnique({
        where: { id: validated.appointmentId },
        include: {
          staff: true,
          service: true,
        },
      });

      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }

      // Check for conflicts with new time
      const conflictCheck = await this.checkAppointmentConflict(
        currentAppointment.staffId,
        validated.newStartTimeUtc,
        validated.newEndTimeUtc,
        currentAppointment.id // Exclude current appointment from conflict check
      );

      if (conflictCheck.hasConflict) {
        throw new Error('New time slot conflicts with existing appointments');
      }

      // Create new slot lock for reschedule
      const newLock = await this.createSlotLock({
        staffId: currentAppointment.staffId,
        serviceId: currentAppointment.serviceId,
        customerId: currentAppointment.customerId,
        startTimeUtc: validated.newStartTimeUtc,
        endTimeUtc: validated.newEndTimeUtc,
        lockType: 'RESCHEDULE',
        createdBy: validated.rescheduledBy,
      });

      // Reschedule within transaction
      const rescheduledAppointment = await prisma.$transaction(async (tx) => {
        // Update original appointment status
        await tx.appointment.update({
          where: { id: validated.appointmentId },
          data: {
            status: 'CANCELLED' as any, // Rescheduled is treated as Cancelled in the db schema
            completedAt: new Date(),
            cancelledAt: new Date(),
            confirmedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create new appointment with rescheduled data
        const newAppointment = await tx.appointment.create({
          data: {
            staffId: currentAppointment.staffId,
            serviceId: currentAppointment.serviceId,
            customerId: currentAppointment.customerId,
            startTimeUtc: new Date(validated.newStartTimeUtc),
            endTimeUtc: new Date(validated.newEndTimeUtc),
            status: AppointmentStatus.BOOKED,
            notes: validated.reason 
              ? `${currentAppointment.notes || ''}\n\nRescheduled: ${validated.reason}`
              : currentAppointment.notes,
            referenceId: this.generateReferenceId(),
            tenantId: await this.getTenantId(currentAppointment.staffId),
            createdBy: validated.rescheduledBy,
          },
        });

        // Update new lock to reference new appointment
        await tx.slotLock.update({
          where: { id: newLock.id },
          data: { 
            appointmentId: newAppointment.id,
          },
        });

        // Release old lock (if exists)
        await tx.slotLock.deleteMany({
          where: {
            appointmentId: validated.appointmentId,
          },
        });

        return newAppointment;
      });

      // Update metrics
      this.metrics.reschedules++;
      const rescheduleTime = Date.now() - startTime;
      this.updateAverageBookingTime(rescheduleTime);

      return {
        ...rescheduledAppointment,
        previousAppointmentId: validated.appointmentId,
        newLockId: newLock.id,
      };

    } catch (error) {
      throw error;
    }
  }

  // Manual booking by staff (with override capability)
  async createManualBooking(data: ManualBookingData): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate request data
      const validated = manualBookingSchema.parse(data);
      
      // Check availability unless override is specified
      if (!validated.overrideAvailability) {
        const conflictCheck = await this.checkAppointmentConflict(
          validated.staffId,
          validated.startTimeUtc,
          validated.endTimeUtc,
          null
        );

        if (conflictCheck.hasConflict) {
          throw new Error('Time slot is not available');
        }
      }

      // Create slot lock for manual booking
      const lock = await this.createSlotLock({
        staffId: validated.staffId,
        serviceId: validated.serviceId,
        customerId: validated.customerId,
        startTimeUtc: validated.startTimeUtc,
        endTimeUtc: validated.endTimeUtc,
        lockType: 'MANUAL',
        createdBy: validated.createdBy,
      });

      // Create appointment within transaction
      const appointment = await prisma.$transaction(async (tx) => {
        const newAppointment = await tx.appointment.create({
          data: {
            staffId: validated.staffId,
            serviceId: validated.serviceId,
            customerId: validated.customerId,
            notes: validated.notes,
            createdBy: validated.createdBy,
            startTimeUtc: new Date(validated.startTimeUtc),
            endTimeUtc: new Date(validated.endTimeUtc),
            status: AppointmentStatus.CONFIRMED, // Manual bookings are auto-confirmed
            referenceId: this.generateReferenceId(),
            tenantId: await this.getTenantId(validated.staffId),
            confirmedAt: new Date(),
          },
        });

        // Update lock to reference appointment
        await tx.slotLock.update({
          where: { id: lock.id },
          data: { 
            appointmentId: newAppointment.id,
          },
        });

        return newAppointment;
      });

      // Update metrics
      this.metrics.successfulBookings++;
      const bookingTime = Date.now() - startTime;
      this.updateAverageBookingTime(bookingTime);

      return {
        ...appointment,
        referenceId: appointment.referenceId,
        lockId: lock.id,
      };

    } catch (error) {
      this.metrics.failedBookings++;
      throw error;
    }
  }

  // Create slot lock
  async createSlotLock(data: any): Promise<any> {
    const lock = await prisma.slotLock.create({
      data: {
        ...data,
        startTimeUtc: new Date(data.startTimeUtc),
        endTimeUtc: new Date(data.endTimeUtc),
        tenantId: await this.getTenantId(data.staffId),
        sessionToken: this.generateSessionToken(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (data.ttlMinutes || 3) * 60 * 1000),
      },
    });

    return lock;
  }

  // Check appointment conflicts
  async checkAppointmentConflict(
    staffId: string,
    startTimeUtc: string,
    endTimeUtc: string,
    excludeAppointmentId: string | null
  ): Promise<AppointmentConflict> {
    const startTime = new Date(startTimeUtc);
    const endTime = new Date(endTimeUtc);

    // Find overlapping appointments
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        status: {
          in: [
            AppointmentStatus.BOOKED,
            AppointmentStatus.CONFIRMED,
          ],
        },
        AND: [
          {
            startTimeUtc: { lt: endTime },
          },
          {
            endTimeUtc: { gt: startTime },
          },
        ],
        ...(excludeAppointmentId && {
          id: { not: excludeAppointmentId },
        }),
      },
      include: {
        customer: {
          select: { name: true },
        },
      },
      orderBy: { startTimeUtc: 'asc' },
    });

    // Check for available slots if there are conflicts
    let availableSlots = [];
    if (conflictingAppointments.length > 0) {
      availableSlots = await this.findAvailableSlots(
        staffId,
        startTime,
        endTime,
        conflictingAppointments
      );
    }

    return {
      hasConflict: conflictingAppointments.length > 0,
      conflictingAppointments: conflictingAppointments.map(apt => ({
        id: apt.id,
        startTimeUtc: apt.startTimeUtc.toISOString(),
        endTimeUtc: apt.endTimeUtc.toISOString(),
        status: apt.status as AppointmentStatus,
        customerName: apt.customer?.name || 'Unknown',
      })),
      availableSlots,
    };
  }

  // Validate status transitions
  private validateStatusTransition(
    fromStatus: AppointmentStatus,
    toStatus: AppointmentStatus | undefined
  ): StatusTransition {
    if (!toStatus) {
      return {
        fromStatus,
        toStatus,
        allowed: true,
      };
    }

    // Define allowed transitions
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.BOOKED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.PENDING_CONFIRMATION]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.RESCHEDULED]: [
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.CANCELLED]: [], // Terminal state
      [AppointmentStatus.COMPLETED]: [], // Terminal state
      [AppointmentStatus.NO_SHOW]: [], // Terminal state
    };

    const allowed = allowedTransitions[fromStatus]?.includes(toStatus) ?? false;

    return {
      fromStatus,
      toStatus,
      allowed,
      reason: allowed ? undefined : `Cannot transition from ${fromStatus} to ${toStatus}`,
    };
  }

  // Find available slots around conflicts
  private async findAvailableSlots(
    staffId: string,
    startTime: Date,
    endTime: Date,
    conflictingAppointments: any[]
  ): Promise<any[]> {
    // Get staff working hours for the day
    const workingSchedule = await prisma.weeklySchedule.findFirst({
      where: {
        staffId,
        dayOfWeek: startTime.getDay(),
        isWorking: true,
      },
      include: { breaks: true },
    });

    if (!workingSchedule) {
      return [];
    }

    // Generate available slots between conflicts
    const availableSlots = [];
    let currentTime = this.timeToMinutes(
      `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
    );
    const endTimeMinutes = this.timeToMinutes(
      `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
    );

    // Sort conflicts by start time
    const sortedConflicts = conflictingAppointments
      .map(apt => ({
        start: this.timeToMinutes(
          new Date(apt.startTimeUtc).toLocaleTimeString('en-US', { hour12: false })
        ),
        end: this.timeToMinutes(
          new Date(apt.endTimeUtc).toLocaleTimeString('en-US', { hour12: false })
        ),
      }))
      .sort((a, b) => a.start - b.start);

    // Find gaps between conflicts
    for (const conflict of sortedConflicts) {
      if (currentTime < conflict.start) {
        availableSlots.push({
          start: this.minutesToTime(currentTime),
          end: this.minutesToTime(conflict.start),
        });
      }
      currentTime = Math.max(currentTime, conflict.end);
    }

    // Add slot after last conflict
    if (currentTime < endTimeMinutes) {
      availableSlots.push({
        start: this.minutesToTime(currentTime),
        end: this.minutesToTime(endTimeMinutes),
      });
    }

    return availableSlots;
  }

  // Generate unique reference ID
  private generateReferenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BK-${timestamp}-${random}`.toUpperCase();
  }

  // Generate session token for slot locks
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }

  // Get tenant ID from staff
  private async getTenantId(staffId: string): Promise<string> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { tenantId: true },
    });

    if (!staff) {
      throw new Error('Staff not found');
    }

    return staff.tenantId;
  }

  // Helper methods
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private updateAverageBookingTime(newTime: number): void {
    const totalBookings = this.metrics.successfulBookings;
    this.metrics.averageBookingTime = 
      (this.metrics.averageBookingTime * (totalBookings - 1) + newTime) / totalBookings;
  }

  // Get performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalBookings > 0 
        ? this.metrics.successfulBookings / this.metrics.totalBookings 
        : 0,
      failureRate: this.metrics.totalBookings > 0 
        ? this.metrics.failedBookings / this.metrics.totalBookings 
        : 0,
    };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      totalBookings: 0,
      successfulBookings: 0,
      failedBookings: 0,
      concurrentBookings: 0,
      averageBookingTime: 0,
      lockExpirations: 0,
      reschedules: 0,
      cancellations: 0,
      noShows: 0,
      lastReset: new Date().toISOString(),
    };
  }
}
