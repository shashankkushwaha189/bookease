import {
  RecurrencePattern,
  DayOfWeek,
  MonthlyRecurrenceType,
  SeriesStatus,
  RecurrenceRule,
  CreateRecurringSeriesData,
  EditRecurringSeriesData,
  CancelRecurringAppointmentData,
  GenerateRecurrenceData,
  RecurringSeriesResponse,
  OccurrenceResponse,
  SeriesMetrics,
  createRecurringSeriesSchema,
  editRecurringSeriesSchema,
  cancelRecurringAppointmentSchema,
  generateRecurrenceSchema,
} from './recurring.schema';
import { prisma } from '../../lib/prisma';

export class RecurringAppointmentEngine {
  private metrics = {
    totalSeries: 0,
    activeSeries: 0,
    pausedSeries: 0,
    totalOccurrences: 0,
    completedOccurrences: 0,
    cancelledOccurrences: 0,
    upcomingOccurrences: 0,
    averageOccurrencesPerSeries: 0,
    generationTime: 0,
    lastReset: new Date().toISOString(),
  };

  // Create recurring appointment series
  async createRecurringSeries(data: CreateRecurringSeriesData): Promise<RecurringSeriesResponse> {
    const startTime = Date.now();

    try {
      // Validate request data
      const validated = createRecurringSeriesSchema.parse(data);
      
      // Generate recurrence dates
      const occurrences = await this.generateRecurrenceDates({
        recurrenceRule: validated.recurrenceRule,
        baseStartTime: validated.startTimeUtc,
        baseEndTime: validated.endTimeUtc,
        maxOccurrences: validated.recurrenceRule.maxOccurrences,
      });

      if (occurrences.length === 0) {
        throw new Error('No valid occurrences generated for the given recurrence rule');
      }

      // Create series and first batch of occurrences within transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create recurring series
        const series = await tx.recurringSeries.create({
          data: {
            title: validated.title,
            staffId: validated.staffId,
            serviceId: validated.serviceId,
            customerId: validated.customerId,
            startTimeUtc: validated.startTimeUtc,
            endTimeUtc: validated.endTimeUtc,
            notes: validated.notes || null,
            recurrenceRule: validated.recurrenceRule as any,
            status: SeriesStatus.ACTIVE,
            totalOccurrences: occurrences.length,
            completedOccurrences: 0,
            cancelledOccurrences: 0,
            nextOccurrence: occurrences[0].startTime,
            tenantId: await this.getTenantId(validated.staffId),
            createdBy: validated.createdBy,
          },
        });

        // Create initial batch of appointments (first 10 occurrences for performance)
        const initialBatch = occurrences.slice(0, 10);
        const appointments = await Promise.all(
          initialBatch.map(async (occurrence, index) => {
            return tx.appointment.create({
              data: {
                seriesId: series.id,
                staffId: validated.staffId,
                serviceId: validated.serviceId,
                customerId: validated.customerId,
                startTimeUtc: occurrence.startTime,
                endTimeUtc: occurrence.endTime,
                status: 'BOOKED',
                referenceId: this.generateReferenceId(),
                notes: validated.notes || null,
                tenantId: await this.getTenantId(validated.staffId),
                createdBy: validated.createdBy,
              },
            });
          })
        );

        return {
          series,
          appointments,
          remainingOccurrences: occurrences.slice(10),
        };
      });

      // Schedule background generation of remaining occurrences if any
      if (result.remainingOccurrences.length > 0) {
        // In production, this would be handled by a background job
        console.log(`Scheduled background generation for ${result.remainingOccurrences.length} remaining occurrences`);
      }

      // Update metrics
      this.metrics.totalSeries++;
      this.metrics.activeSeries++;
      this.metrics.totalOccurrences += occurrences.length;
      this.metrics.upcomingOccurrences += occurrences.length;
      this.updateAverageOccurrencesPerSeries();

      const generationTime = Date.now() - startTime;
      this.metrics.generationTime = (this.metrics.generationTime + generationTime) / 2;

      return {
        ...result.series,
        totalOccurrences: occurrences.length,
        completedOccurrences: 0,
        cancelledOccurrences: 0,
        nextOccurrence: occurrences[0].startTime,
      };

    } catch (error) {
      throw error;
    }
  }

  // Generate recurrence dates - Core logic for all patterns
  async generateRecurrenceDates(data: GenerateRecurrenceData): Promise<Array<{startTime: string, endTime: string}>> {
    const startTime = Date.now();
    const { recurrenceRule, baseStartTime, baseEndTime, maxOccurrences = 52 } = data;

    const startDate = new Date(recurrenceRule.startDate);
    const endDate = recurrenceRule.endDate ? new Date(recurrenceRule.endDate) : null;
    const baseStart = new Date(baseStartTime);
    const baseEnd = new Date(baseEndTime);
    
    const occurrences: Array<{startTime: string, endTime: string}> = [];
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    // Reset time to start of day for date calculations
    currentDate.setHours(0, 0, 0, 0);

    while (
      (!endDate || currentDate <= endDate) && 
      occurrenceCount < maxOccurrences &&
      occurrenceCount < 365 // Max 1 year of occurrences
    ) {
      switch (recurrenceRule.pattern) {
        case RecurrencePattern.WEEKLY:
          this.processWeeklyRecurrence(currentDate, recurrenceRule, baseStart, baseEnd, occurrences);
          currentDate.setDate(currentDate.getDate() + 7 * recurrenceRule.interval);
          break;

        case RecurrencePattern.BI_WEEKLY:
          this.processWeeklyRecurrence(currentDate, recurrenceRule, baseStart, baseEnd, occurrences);
          currentDate.setDate(currentDate.getDate() + 14 * recurrenceRule.interval);
          break;

        case RecurrencePattern.MONTHLY:
          this.processMonthlyRecurrence(currentDate, recurrenceRule, baseStart, baseEnd, occurrences);
          currentDate.setMonth(currentDate.getMonth() + recurrenceRule.interval);
          break;
      }

      occurrenceCount++;
    }

    // Apply exceptions (dates to skip)
    const exceptionDates = new Set(recurrenceRule.exceptions || []);
    const filteredOccurrences = occurrences.filter(occ => 
      !exceptionDates.has(occ.startTime.split('T')[0])
    );

    const generationTime = Date.now() - startTime;
    console.log(`Generated ${filteredOccurrences.length} occurrences in ${generationTime}ms`);

    return filteredOccurrences;
  }

  // Process weekly recurrence
  private processWeeklyRecurrence(
    currentDate: Date,
    recurrenceRule: RecurrenceRule,
    baseStart: Date,
    baseEnd: Date,
    occurrences: Array<{startTime: string, endTime: string}>
  ): void {
    for (const dayOfWeek of recurrenceRule.daysOfWeek) {
      const targetDate = new Date(currentDate);
      const currentDay = targetDate.getDay();
      
      // Calculate days to add to reach target day
      let daysToAdd = dayOfWeek - currentDay;
      if (daysToAdd < 0) daysToAdd += 7; // If target day is earlier in week, go to next week
      
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      
      // Set the time based on base appointment
      targetDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const endTime = new Date(targetDate);
      endTime.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);

      occurrences.push({
        startTime: targetDate.toISOString(),
        endTime: endTime.toISOString(),
      });
    }
  }

  // Process monthly recurrence
  private processMonthlyRecurrence(
    currentDate: Date,
    recurrenceRule: RecurrenceRule,
    baseStart: Date,
    baseEnd: Date,
    occurrences: Array<{startTime: string, endTime: string}>
  ): void {
    if (recurrenceRule.monthlyType === MonthlyRecurrenceType.DAY_OF_MONTH) {
      // Day of month recurrence (e.g., 15th of every month)
      const targetDay = recurrenceRule.dayOfMonth || currentDate.getDate();
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
      
      // Adjust if target day doesn't exist in this month (e.g., Feb 30)
      if (targetDate.getMonth() !== currentDate.getMonth()) {
        // Set to last day of the month
        targetDate.setMonth(currentDate.getMonth() + 1);
        targetDate.setDate(0);
      }

      targetDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      const endTime = new Date(targetDate);
      endTime.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);

      occurrences.push({
        startTime: targetDate.toISOString(),
        endTime: endTime.toISOString(),
      });

    } else if (recurrenceRule.monthlyType === MonthlyRecurrenceType.DAY_OF_WEEK) {
      // Day of week recurrence (e.g., 3rd Tuesday of every month)
      const targetDayOfWeek = recurrenceRule.daysOfWeek[0]; // Use first day for monthly
      const weekOfMonth = recurrenceRule.weekOfMonth || 1;
      
      const targetDate = this.findNthDayOfWeekInMonth(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        targetDayOfWeek,
        weekOfMonth
      );

      if (targetDate) {
        targetDate.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
        const endTime = new Date(targetDate);
        endTime.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);

        occurrences.push({
          startTime: targetDate.toISOString(),
          endTime: endTime.toISOString(),
        });
      }
    }
  }

  // Find the Nth occurrence of a specific day of week in a month
  private findNthDayOfWeekInMonth(
    year: number,
    month: number,
    dayOfWeek: DayOfWeek,
    weekOfMonth: number
  ): Date | null {
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Find the first occurrence of the target day
    let daysUntilFirst = dayOfWeek - firstDayOfWeek;
    if (daysUntilFirst < 0) daysUntilFirst += 7;
    
    const firstOccurrence = new Date(year, month, 1 + daysUntilFirst);
    
    // Add weeks to reach the Nth occurrence
    const targetDate = new Date(firstOccurrence);
    targetDate.setDate(targetDate.getDate() + (weekOfMonth - 1) * 7);
    
    // Check if we're still in the same month
    if (targetDate.getMonth() !== month) {
      return null; // Nth occurrence doesn't exist in this month
    }
    
    return targetDate;
  }

  // Edit recurring series
  async editRecurringSeries(data: EditRecurringSeriesData): Promise<RecurringSeriesResponse> {
    try {
      const validated = editRecurringSeriesSchema.parse(data);
      
      const series = await prisma.recurringSeries.findUnique({
        where: { id: validated.seriesId },
      });

      if (!series) {
        throw new Error('Recurring series not found');
      }

      if (validated.editMode === 'ENTIRE_SERIES') {
        // Edit entire series
        const updatedSeries = await prisma.$transaction(async (tx) => {
          // Update series
          const updated = await tx.recurringSeries.update({
            where: { id: validated.seriesId },
            data: {
              ...(validated.title && { title: validated.title }),
              ...(validated.startTimeUtc && { startTimeUtc: validated.startTimeUtc }),
              ...(validated.endTimeUtc && { endTimeUtc: validated.endTimeUtc }),
              ...(validated.notes !== undefined && { notes: validated.notes }),
              ...(validated.recurrenceRule && { recurrenceRule: validated.recurrenceRule as any }),
              updatedAt: new Date(),
              updatedBy: validated.updatedBy,
            },
          });

          // If recurrence rule changed, regenerate future occurrences
          if (validated.recurrenceRule) {
            await this.regenerateFutureOccurrences(tx, updated, validated.effectiveDate);
          }

          return updated;
        });

        return updatedSeries;

      } else {
        // Edit this and future occurrences
        const effectiveDate = new Date(validated.effectiveDate);
        
        // Create new series starting from effective date
        const newSeries = await prisma.$transaction(async (tx) => {
          // Cancel future occurrences in original series
          await tx.appointment.updateMany({
            where: {
              seriesId: validated.seriesId,
              startTimeUtc: { gte: effectiveDate.toISOString() },
              status: { not: 'CANCELLED' },
            },
            data: {
              status: 'CANCELLED',
              updatedAt: new Date(),
            },
          });

          // Create new series with updated rules
          const newSeriesData = {
            title: validated.title || series.title,
            staffId: series.staffId,
            serviceId: series.serviceId,
            customerId: series.customerId,
            startTimeUtc: validated.startTimeUtc || series.startTimeUtc,
            endTimeUtc: validated.endTimeUtc || series.endTimeUtc,
            notes: validated.notes !== undefined ? validated.notes : series.notes,
            recurrenceRule: validated.recurrenceRule || (series.recurrenceRule as RecurrenceRule),
            status: SeriesStatus.ACTIVE,
            totalOccurrences: 0, // Will be calculated
            completedOccurrences: 0,
            cancelledOccurrences: 0,
            nextOccurrence: null, // Will be calculated
            tenantId: series.tenantId,
            createdBy: validated.updatedBy,
          };

          const newSeries = await tx.recurringSeries.create({
            data: newSeriesData,
          });

          // Generate occurrences starting from effective date
          const newRecurrenceRule = {
            ...newSeriesData.recurrenceRule,
            startDate: effectiveDate.toISOString(),
          };

          const occurrences = await this.generateRecurrenceDates({
            recurrenceRule: newRecurrenceRule,
            baseStartTime: newSeriesData.startTimeUtc,
            baseEndTime: newSeriesData.endTimeUtc,
          });

          // Create new occurrences
          await Promise.all(
            occurrences.slice(0, 10).map(occurrence =>
              tx.appointment.create({
                data: {
                  seriesId: newSeries.id,
                  staffId: newSeriesData.staffId,
                  serviceId: newSeriesData.serviceId,
                  customerId: newSeriesData.customerId,
                  startTimeUtc: occurrence.startTime,
                  endTimeUtc: occurrence.endTime,
                  status: 'BOOKED',
                  referenceId: this.generateReferenceId(),
                  notes: newSeriesData.notes,
                  tenantId: newSeriesData.tenantId,
                  createdBy: validated.updatedBy,
                },
              })
            )
          );

          return newSeries;
        });

        return newSeries;
      }

    } catch (error) {
      throw error;
    }
  }

  // Cancel recurring appointment
  async cancelRecurringAppointment(data: CancelRecurringAppointmentData): Promise<void> {
    try {
      const validated = cancelRecurringAppointmentSchema.parse(data);
      
      if (validated.cancelMode === 'SINGLE') {
        // Cancel single appointment
        await prisma.appointment.update({
          where: { id: validated.appointmentId },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
            notes: validated.reason,
          },
        });

        // Update series metrics
        const appointment = await prisma.appointment.findUnique({
          where: { id: validated.appointmentId },
          select: { seriesId: true },
        });

        if (appointment?.seriesId) {
          await prisma.recurringSeries.update({
            where: { id: appointment.seriesId },
            data: {
              cancelledOccurrences: { increment: 1 },
            },
          });
        }

      } else if (validated.cancelMode === 'THIS_AND_FUTURE') {
        // Cancel this and all future appointments
        const appointment = await prisma.appointment.findUnique({
          where: { id: validated.appointmentId },
          select: { seriesId: true, startTimeUtc: true },
        });

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        const cancelledCount = await prisma.appointment.updateMany({
          where: {
            seriesId: appointment.seriesId,
            startTimeUtc: { gte: appointment.startTimeUtc },
            status: { not: 'CANCELLED' },
          },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
            notes: validated.reason,
          },
        });

        // Update series metrics
        await prisma.recurringSeries.update({
          where: { id: appointment.seriesId },
          data: {
            cancelledOccurrences: { increment: cancelledCount.count },
          },
        });

      } else if (validated.cancelMode === 'ENTIRE_SERIES') {
        // Cancel entire series
        const appointment = await prisma.appointment.findUnique({
          where: { id: validated.appointmentId },
          select: { seriesId: true },
        });

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        const cancelledCount = await prisma.appointment.updateMany({
          where: {
            seriesId: appointment.seriesId,
            status: { not: 'CANCELLED' },
          },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
            notes: validated.reason,
          },
        });

        // Update series status
        await prisma.recurringSeries.update({
          where: { id: appointment.seriesId },
          data: {
            status: SeriesStatus.CANCELLED,
            cancelledOccurrences: { increment: cancelledCount.count },
          },
        });
      }

    } catch (error) {
      throw error;
    }
  }

  // Get series with occurrences
  async getSeriesWithOccurrences(seriesId: string): Promise<RecurringSeriesResponse & { occurrences: OccurrenceResponse[] }> {
    const series = await prisma.recurringSeries.findUnique({
      where: { id: seriesId },
      include: {
        appointments: {
          orderBy: { startTimeUtc: 'asc' },
        },
      },
    });

    if (!series) {
      throw new Error('Series not found');
    }

    const occurrences = series.appointments.map(apt => ({
      id: apt.id,
      seriesId: apt.seriesId || '',
      occurrenceDate: apt.startTimeUtc,
      startTimeUtc: apt.startTimeUtc,
      endTimeUtc: apt.endTimeUtc,
      status: apt.status,
      isException: false, // TODO: Implement exception tracking
      referenceId: apt.referenceId,
      createdAt: apt.createdAt.toISOString(),
    }));

    return {
      ...series,
      occurrences,
    } as RecurringSeriesResponse & { occurrences: OccurrenceResponse[] };
  }

  // Get series metrics
  getMetrics(): SeriesMetrics {
    return {
      ...this.metrics,
      averageOccurrencesPerSeries: this.metrics.averageOccurrencesPerSeries,
    };
  }

  // Helper methods
  private generateReferenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BK-${timestamp}-${random}`.toUpperCase();
  }

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

  private updateAverageOccurrencesPerSeries(): void {
    if (this.metrics.totalSeries > 0) {
      this.metrics.averageOccurrencesPerSeries = 
        this.metrics.totalOccurrences / this.metrics.totalSeries;
    }
  }

  private async regenerateFutureOccurrences(
    tx: any,
    series: any,
    effectiveDate: string
  ): Promise<void> {
    // Cancel future occurrences
    await tx.appointment.updateMany({
      where: {
        seriesId: series.id,
        startTimeUtc: { gte: effectiveDate },
        status: { not: 'CANCELLED' },
      },
      data: { status: 'CANCELLED' },
    });

    // Generate new occurrences with updated rule
    const occurrences = await this.generateRecurrenceDates({
      recurrenceRule: series.recurrenceRule as RecurrenceRule,
      baseStartTime: series.startTimeUtc,
      baseEndTime: series.endTimeUtc,
    });

    // Create new future occurrences
    const futureOccurrences = occurrences.filter(occ => 
      new Date(occ.startTime) >= new Date(effectiveDate)
    );

    await Promise.all(
      futureOccurrences.slice(0, 10).map(occurrence =>
        tx.appointment.create({
          data: {
            seriesId: series.id,
            staffId: series.staffId,
            serviceId: series.serviceId,
            customerId: series.customerId,
            startTimeUtc: occurrence.startTime,
            endTimeUtc: occurrence.endTime,
            status: 'BOOKED',
            referenceId: this.generateReferenceId(),
            notes: series.notes,
            tenantId: series.tenantId,
            createdBy: series.updatedBy || series.createdBy,
          },
        })
      )
    );
  }
}
