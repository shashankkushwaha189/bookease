"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentEngine = void 0;
const appointment_schema_1 = require("./appointment.schema");
const prisma_1 = require("../../lib/prisma");
class AppointmentEngine {
    metrics = {
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
    async createAppointment(data) {
        const startTime = Date.now();
        this.metrics.totalBookings++;
        this.metrics.concurrentBookings++;
        try {
            // Validate request data
            const validated = appointment_schema_1.createAppointmentSchema.parse(data);
            // Generate unique reference ID
            const referenceId = this.generateReferenceId();
            // Check for conflicts before creating lock
            const conflictCheck = await this.checkAppointmentConflict(validated.staffId, validated.startTimeUtc, validated.endTimeUtc, null // Exclude current appointment ID
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
            const appointment = await prisma_1.prisma.$transaction(async (tx) => {
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
                        ...validated,
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
            // Record successful booking attempt
            await this.recordBookingAttempt({
                staffId: validated.staffId,
                serviceId: validated.serviceId,
                customerId: validated.customerId,
                startTimeUtc: validated.startTimeUtc,
                endTimeUtc: validated.endTimeUtc,
                success: true,
                lockId: lock.id,
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
        }
        catch (error) {
            this.metrics.failedBookings++;
            throw error;
        }
        finally {
            this.metrics.concurrentBookings--;
        }
    }
    // Update appointment with status lifecycle enforcement
    async updateAppointment(appointmentId, data) {
        const startTime = Date.now();
        try {
            // Validate request data
            const validated = appointment_schema_1.updateAppointmentSchema.parse(data);
            // Get current appointment
            const currentAppointment = await prisma_1.prisma.appointment.findUnique({
                where: { id: appointmentId },
            });
            if (!currentAppointment) {
                throw new Error('Appointment not found');
            }
            // Validate status transition
            const transition = this.validateStatusTransition(currentAppointment.status, validated.status);
            if (!transition.allowed) {
                throw new Error(`Invalid status transition: ${currentAppointment.status} -> ${validated.status}`);
            }
            // Update appointment within transaction
            const updatedAppointment = await prisma_1.prisma.$transaction(async (tx) => {
                const updated = await tx.appointment.update({
                    where: { id: appointmentId },
                    data: {
                        ...validated,
                        updatedAt: new Date(),
                        // Add timestamps for status changes
                        ...(validated.status === appointment_schema_1.AppointmentStatus.CONFIRMED && { confirmedAt: new Date() }),
                        ...(validated.status === appointment_schema_1.AppointmentStatus.CANCELLED && { cancelledAt: new Date() }),
                        ...(validated.status === appointment_schema_1.AppointmentStatus.COMPLETED && { completedAt: new Date() }),
                    },
                });
                // Update metrics based on status change
                if (validated.status === appointment_schema_1.AppointmentStatus.CANCELLED) {
                    this.metrics.cancellations++;
                }
                else if (validated.status === appointment_schema_1.AppointmentStatus.NO_SHOW) {
                    this.metrics.noShows++;
                }
                return updated;
            });
            return updatedAppointment;
        }
        catch (error) {
            throw error;
        }
    }
    // Reschedule appointment with conflict detection
    async rescheduleAppointment(data) {
        const startTime = Date.now();
        try {
            // Validate request data
            const validated = appointment_schema_1.rescheduleAppointmentSchema.parse(data);
            // Get current appointment
            const currentAppointment = await prisma_1.prisma.appointment.findUnique({
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
            const conflictCheck = await this.checkAppointmentConflict(currentAppointment.staffId, validated.newStartTimeUtc, validated.newEndTimeUtc, currentAppointment.id // Exclude current appointment from conflict check
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
            const rescheduledAppointment = await prisma_1.prisma.$transaction(async (tx) => {
                // Update original appointment status
                await tx.appointment.update({
                    where: { id: validated.appointmentId },
                    data: {
                        status: appointment_schema_1.AppointmentStatus.RESCHEDULED,
                        updatedAt: new Date(),
                    },
                });
                // Create new appointment with rescheduled data
                const newAppointment = await tx.appointment.create({
                    data: {
                        staffId: currentAppointment.staffId,
                        serviceId: currentAppointment.serviceId,
                        customerId: currentAppointment.customerId,
                        startTimeUtc: validated.newStartTimeUtc,
                        endTimeUtc: validated.newEndTimeUtc,
                        status: appointment_schema_1.AppointmentStatus.BOOKED,
                        notes: validated.reason
                            ? `${currentAppointment.notes || ''}\n\nRescheduled: ${validated.reason}`
                            : currentAppointment.notes,
                        requiresConfirmation: currentAppointment.requiresConfirmation,
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
        }
        catch (error) {
            throw error;
        }
    }
    // Manual booking by staff (with override capability)
    async createManualBooking(data) {
        const startTime = Date.now();
        try {
            // Validate request data
            const validated = appointment_schema_1.manualBookingSchema.parse(data);
            // Check availability unless override is specified
            if (!validated.overrideAvailability) {
                const conflictCheck = await this.checkAppointmentConflict(validated.staffId, validated.startTimeUtc, validated.endTimeUtc, null);
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
            const appointment = await prisma_1.prisma.$transaction(async (tx) => {
                const newAppointment = await tx.appointment.create({
                    data: {
                        ...validated,
                        status: appointment_schema_1.AppointmentStatus.CONFIRMED, // Manual bookings are auto-confirmed
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
            // Record successful booking attempt
            await this.recordBookingAttempt({
                staffId: validated.staffId,
                serviceId: validated.serviceId,
                customerId: validated.customerId,
                startTimeUtc: validated.startTimeUtc,
                endTimeUtc: validated.endTimeUtc,
                success: true,
                lockId: lock.id,
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
        }
        catch (error) {
            this.metrics.failedBookings++;
            throw error;
        }
    }
    // Create slot lock
    async createSlotLock(data) {
        const lockData = appointment_schema_1.slotLockSchema.parse(data);
        const lock = await prisma_1.prisma.slotLock.create({
            data: {
                ...lockData,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + lockData.ttlMinutes * 60 * 1000),
            },
        });
        return lock;
    }
    // Check appointment conflicts
    async checkAppointmentConflict(staffId, startTimeUtc, endTimeUtc, excludeAppointmentId) {
        const startTime = new Date(startTimeUtc);
        const endTime = new Date(endTimeUtc);
        // Find overlapping appointments
        const conflictingAppointments = await prisma_1.prisma.appointment.findMany({
            where: {
                staffId,
                status: {
                    in: [
                        appointment_schema_1.AppointmentStatus.BOOKED,
                        appointment_schema_1.AppointmentStatus.CONFIRMED,
                        appointment_schema_1.AppointmentStatus.PENDING_CONFIRMATION,
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
            availableSlots = await this.findAvailableSlots(staffId, startTime, endTime, conflictingAppointments);
        }
        return {
            hasConflict: conflictingAppointments.length > 0,
            conflictingAppointments: conflictingAppointments.map(apt => ({
                id: apt.id,
                startTimeUtc: apt.startTimeUtc.toISOString(),
                endTimeUtc: apt.endTimeUtc.toISOString(),
                status: apt.status,
                customerName: apt.customer?.name || 'Unknown',
            })),
            availableSlots,
        };
    }
    // Validate status transitions
    validateStatusTransition(fromStatus, toStatus) {
        if (!toStatus) {
            return {
                fromStatus,
                toStatus,
                allowed: true,
            };
        }
        // Define allowed transitions
        const allowedTransitions = {
            [appointment_schema_1.AppointmentStatus.BOOKED]: [
                appointment_schema_1.AppointmentStatus.CONFIRMED,
                appointment_schema_1.AppointmentStatus.CANCELLED,
                appointment_schema_1.AppointmentStatus.RESCHEDULED,
            ],
            [appointment_schema_1.AppointmentStatus.CONFIRMED]: [
                appointment_schema_1.AppointmentStatus.CANCELLED,
                appointment_schema_1.AppointmentStatus.RESCHEDULED,
                appointment_schema_1.AppointmentStatus.COMPLETED,
                appointment_schema_1.AppointmentStatus.NO_SHOW,
            ],
            [appointment_schema_1.AppointmentStatus.PENDING_CONFIRMATION]: [
                appointment_schema_1.AppointmentStatus.CONFIRMED,
                appointment_schema_1.AppointmentStatus.CANCELLED,
            ],
            [appointment_schema_1.AppointmentStatus.RESCHEDULED]: [
                appointment_schema_1.AppointmentStatus.CANCELLED,
            ],
            [appointment_schema_1.AppointmentStatus.CANCELLED]: [], // Terminal state
            [appointment_schema_1.AppointmentStatus.COMPLETED]: [], // Terminal state
            [appointment_schema_1.AppointmentStatus.NO_SHOW]: [], // Terminal state
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
    async findAvailableSlots(staffId, startTime, endTime, conflictingAppointments) {
        // Get staff working hours for the day
        const workingSchedule = await prisma_1.prisma.weeklySchedule.findFirst({
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
        let currentTime = this.timeToMinutes(`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`);
        const endTimeMinutes = this.timeToMinutes(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`);
        // Sort conflicts by start time
        const sortedConflicts = conflictingAppointments
            .map(apt => ({
            start: this.timeToMinutes(new Date(apt.startTimeUtc).toLocaleTimeString('en-US', { hour12: false })),
            end: this.timeToMinutes(new Date(apt.endTimeUtc).toLocaleTimeString('en-US', { hour12: false })),
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
    generateReferenceId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `BK-${timestamp}-${random}`.toUpperCase();
    }
    // Record booking attempt for analytics
    async recordBookingAttempt(data) {
        const attemptData = {
            ...data,
            attemptAt: new Date().toISOString(),
        };
        await prisma_1.prisma.bookingAttempt.create({
            data: attemptData,
        });
    }
    // Get tenant ID from staff
    async getTenantId(staffId) {
        const staff = await prisma_1.prisma.staff.findUnique({
            where: { id: staffId },
            select: { tenantId: true },
        });
        if (!staff) {
            throw new Error('Staff not found');
        }
        return staff.tenantId;
    }
    // Helper methods
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    updateAverageBookingTime(newTime) {
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
    resetMetrics() {
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
exports.AppointmentEngine = AppointmentEngine;
