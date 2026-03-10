import { AppointmentRepository } from "./appointment.repository";
import { AppointmentStatus, Prisma, RecurringFrequency, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import cron from "node-cron";
import { addWeeks, addMonths } from "date-fns";
import { configService } from "../config/config.service";
import { policyService } from "../policy/policy.service";
import { timelineService } from "../appointment-timeline/timeline.service";
import { auditService } from "../audit/audit.service";
import { TimelineEvent } from "@prisma/client";

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

export class AppointmentService {
    private repository: AppointmentRepository;

    constructor() {
        this.repository = new AppointmentRepository();
        this.scheduleCleanupJob();
        this.scheduleNoShowJob();
    }

    private async generateReferenceId(tenantId: string): Promise<string> {
        const ids = await this.generateReferenceIds(tenantId, 1);
        return ids[0];
    }

    private async generateReferenceIds(tenantId: string, count: number): Promise<string[]> {
        const year = new Date().getFullYear();
        const lastRef = await this.repository.getLastReferenceId(tenantId, year);

        let sequence = 1;
        if (lastRef) {
            const parts = lastRef.split("-");
            sequence = parseInt(parts[2], 10) + 1;
        }

        const ids = [];
        for (let i = 0; i < count; i++) {
            ids.push(`BK-${year}-${String(sequence + i).padStart(5, "0")}`);
        }
        return ids;
    }

    async createBooking(data: {
        tenantId: string;
        serviceId: string;
        staffId: string;
        customer: {
            name: string;
            email: string;
            phone?: string;
        };
        startTimeUtc: string;
        endTimeUtc: string;
        sessionToken: string;
        notes?: string;
        ipAddress: string;
        consentGiven: boolean;
    }) {
        const referenceId = await this.generateReferenceId(data.tenantId);

        // 0. Consent check
        if (!data.consentGiven) {
            throw new Error("CONSENT_REQUIRED");
        }

        // 1. Ensure customer exists or create them
        let customer = await this.repository.findCustomerByEmail(data.tenantId, data.customer.email);
        if (!customer) {
            customer = await this.repository.createCustomer({
                tenantId: data.tenantId,
                ...data.customer,
            });
        }

        try {
            const appointment = await this.repository.createWithLockAndConsent({
                tenantId: data.tenantId,
                serviceId: data.serviceId,
                staffId: data.staffId,
                customerId: customer.id,
                startTimeUtc: new Date(data.startTimeUtc),
                endTimeUtc: new Date(data.endTimeUtc),
                referenceId,
                notes: data.notes,
                consentGiven: data.consentGiven,
                ipAddress: data.ipAddress,
                policyVersion: "v1.0",
            });

            // Recording events
            const correlationId = data.sessionToken; // Use session token as initial correlation
            await timelineService.addEvent({
                appointmentId: appointment.id,
                tenantId: data.tenantId,
                eventType: TimelineEvent.CREATED,
                performedBy: "PUBLIC",
                note: "Appointment booked by customer",
                metadata: {
                    ipAddress: data.ipAddress,
                    serviceId: data.serviceId,
                }
            });

            auditService.logEvent({
                tenantId: data.tenantId,
                action: "appointment.create",
                resourceType: "Appointment",
                resourceId: appointment.id,
                correlationId,
                after: appointment,
                ipAddress: data.ipAddress,
            });

            return appointment;
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new Error("SLOT_TAKEN");
                }
            }
            throw error;
        }
    }

    async createRecurringBooking(data: {
        tenantId: string;
        serviceId: string;
        staffId: string;
        customer: {
            name: string;
            email: string;
            phone?: string;
        };
        startTimeUtc: string;
        endTimeUtc: string;
        recurring: {
            frequency: RecurringFrequency;
            occurrences: number;
        };
        notes?: string;
        createdBy?: string;
    }) {
        const startTime = Date.now(); // Performance tracking
        
        // Validate recurring parameters
        if (data.recurring.occurrences < 1 || data.recurring.occurrences > 104) {
            throw new Error("INVALID_OCCURRENCES: Must be between 1 and 104");
        }

        // 1. Ensure customer
        let customer = await this.repository.findCustomerByEmail(data.tenantId, data.customer.email);
        if (!customer) {
            customer = await this.repository.createCustomer({
                tenantId: data.tenantId,
                ...data.customer,
            });
        }

        // 2. Generate dates efficiently
        const start = new Date(data.startTimeUtc);
        const end = new Date(data.endTimeUtc);
        const duration = end.getTime() - start.getTime();

        const dates = this.generateSeriesDates(start, data.recurring.frequency, data.recurring.occurrences);
        const referenceIds = await this.generateReferenceIds(data.tenantId, dates.length);

        // 3. Prepare appointments data for bulk creation
        const appointments = dates.map((date, i) => ({
            serviceId: data.serviceId,
            staffId: data.staffId,
            customerId: customer!.id,
            startTimeUtc: date,
            endTimeUtc: new Date(date.getTime() + duration),
            referenceId: referenceIds[i],
            notes: data.notes,
            createdBy: data.createdBy,
        }));

        // 4. Create series and appointments in single transaction
        const result = await this.repository.createRecurringSeries({
            tenantId: data.tenantId,
            frequency: data.recurring.frequency,
            occurrences: data.recurring.occurrences,
            appointments,
        });

        const generationTime = Date.now() - startTime;
        logger.info({
            tenantId: data.tenantId,
            seriesId: result.series.id,
            occurrences: data.recurring.occurrences,
            frequency: data.recurring.frequency,
            generationTime,
            avgTimePerOccurrence: (generationTime / data.recurring.occurrences).toFixed(2) + 'ms'
        }, 'Recurring appointment series created');

        return result;
    }

    private generateSeriesDates(start: Date, frequency: RecurringFrequency, count: number): Date[] {
        const dates: Date[] = [];
        const startDate = new Date(start); // Clone to avoid mutation

        // Pre-allocate array for performance
        dates.length = count;

        for (let i = 0; i < count; i++) {
            let currentDate: Date;
            
            switch (frequency) {
                case RecurringFrequency.WEEKLY:
                    currentDate = addWeeks(startDate, i);
                    break;
                case RecurringFrequency.BIWEEKLY:
                    currentDate = addWeeks(startDate, i * 2);
                    break;
                case RecurringFrequency.MONTHLY:
                    currentDate = addMonths(startDate, i);
                    break;
                default:
                    throw new Error(`Unsupported frequency: ${frequency}`);
            }
            
            dates[i] = currentDate;
        }

        return dates;
    }

    async createLock(data: {
        tenantId: string;
        staffId: string;
        startTimeUtc: Date;
        endTimeUtc: Date;
        sessionToken: string;
    }) {
        // Enhanced slot locking with 2-5 minute TTL (configurable)
        const lockTtlMinutes = 3; // Default 3 minutes, can be made configurable
        const expiresAt = new Date(Date.now() + lockTtlMinutes * 60 * 1000);
        
        try {
            const lock = await this.repository.createLock({
                ...data,
                expiresAt,
            });

            logger.info({
                tenantId: data.tenantId,
                staffId: data.staffId,
                startTimeUtc: data.startTimeUtc,
                sessionToken: data.sessionToken,
                expiresAt,
                lockTtlMinutes
            }, 'Slot lock created successfully');

            return lock;
        } catch (error: any) {
            if (error.code === 'P2002') {
                // Unique constraint violation - slot already locked
                throw new Error('SLOT_ALREADY_LOCKED');
            }
            throw error;
        }
    }

    async releaseLock(lockId: string) {
        return this.repository.deleteLock(lockId);
    }

    private scheduleCleanupJob() {
        cron.schedule("*/5 * * * *", async () => {
            try {
                await this.repository.deleteExpiredLocks();
            } catch (error) {
                console.error("Error in slot lock cleanup job:", error);
            }
        });
    }

    private scheduleNoShowJob() {
        // Runs hourly
        cron.schedule("0 * * * *", async () => {
            try {
                console.log("Running hourly NO_SHOW marking job...");
                await this.markNoShows();
            } catch (error) {
                console.error("Error in no-show job:", error);
            }
        });
    }

    async markNoShows() {
        // This is a bit complex for a single query if we want policy-aware per tenant
        // For now, we'll get all tenants, get their configs, and process.
        // In a real high-scale app, we'd do this differently.
        const appointments = await prisma.appointment.findMany({
            where: {
                status: { in: [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED] },
                startTimeUtc: { lt: new Date() }, // Only ones in the past
            },
        });

        for (const app of appointments) {
            const config = await configService.getConfig(app.tenantId);
            const noShowCheck = policyService.shouldMarkNoShow(app, config);
            
            if (noShowCheck.shouldMark) {
                await this.repository.updateStatus(
                    app.id,
                    AppointmentStatus.NO_SHOW,
                    undefined,
                    "Marked as NO_SHOW by automated job"
                );

                timelineService.addEvent({
                    appointmentId: app.id,
                    tenantId: app.tenantId,
                    eventType: TimelineEvent.NO_SHOW_MARKED,
                    performedBy: "SYSTEM",
                    note: "Marked as NO_SHOW by automated job"
                }).catch(console.error);

                auditService.logEvent({
                    tenantId: app.tenantId,
                    action: "appointment.status.no_show",
                    resourceType: "Appointment",
                    resourceId: app.id,
                    correlationId: `noshow-job-${Date.now()}`,
                    after: { status: AppointmentStatus.NO_SHOW },
                    reason: "Automated grace period check"
                });

                logger.info({
                    tenantId: app.tenantId,
                    appointmentId: app.id,
                    gracePeriodEnds: noShowCheck.gracePeriodEnds,
                    reason: noShowCheck.reason
                }, 'Appointment marked as NO_SHOW');
            }
        }
    }

    async getAppointments(filter: {
        tenantId: string;
        date?: string;
        staffId?: string;
        status?: AppointmentStatus;
        isArchived?: boolean;
        page?: number;
        limit?: number;
    }) {
        const page = filter.page || 1;
        const limit = filter.limit || 10;
        const skip = (page - 1) * limit;

        return this.repository.findAppointments({
            tenantId: filter.tenantId,
            date: filter.date,
            staffId: filter.staffId,
            status: filter.status,
            isArchived: filter.isArchived,
            skip,
            take: limit,
        });
    }

    async getAppointmentById(id: string) {
        return this.repository.findById(id);
    }

    async updateAppointmentStatus(id: string, status: AppointmentStatus, userId?: string, notes?: string) {
        const appointment = await this.repository.findById(id);
        if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");

        const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
            [AppointmentStatus.BOOKED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
            [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
            [AppointmentStatus.COMPLETED]: [],
            [AppointmentStatus.CANCELLED]: [],
            [AppointmentStatus.NO_SHOW]: [],
        };

        if (!allowedTransitions[appointment.status].includes(status)) {
            throw new Error("INVALID_STATUS_TRANSITION");
        }

        const updated = await this.repository.updateStatus(id, status, userId, notes);

        // Timeline
        let eventType: TimelineEvent = TimelineEvent.NOTE_ADDED;
        if (status === AppointmentStatus.CONFIRMED) eventType = TimelineEvent.CONFIRMED;
        if (status === AppointmentStatus.COMPLETED) eventType = TimelineEvent.COMPLETED;
        if (status === AppointmentStatus.NO_SHOW) eventType = TimelineEvent.NO_SHOW_MARKED;
        if (status === AppointmentStatus.CANCELLED) eventType = TimelineEvent.CANCELLED;

        await timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType,
            performedBy: userId || "SYSTEM",
            note: notes,
            metadata: { previousStatus: appointment.status, newStatus: status }
        });

        auditService.logEvent({
            tenantId: appointment.tenantId,
            action: `appointment.status.${status.toLowerCase()}`,
            resourceType: "Appointment",
            resourceId: id,
            correlationId: `status-${id}-${Date.now()}`,
            userId,
            before: { status: appointment.status },
            after: { status: updated.status },
            reason: notes
        });

        return updated;
    }

    async cancelAppointment(id: string, scope: "single" | "series", user: { id: string; role: UserRole }, overrideReason?: string) {
        const appointment = await this.repository.findById(id);
        if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");

        const config = await configService.getConfig(appointment.tenantId);
        
        // Enhanced policy check with admin override support
        const policyCheck = policyService.canCancel(
            appointment,
            config,
            user,
            overrideReason
        );

        if (!policyCheck.allowed) {
            throw new Error(policyCheck.reason || "Cancellation not allowed");
        }

        const notes = overrideReason ? `[OVERRIDE] ${overrideReason}` : "Cancelled by user/admin";

        let result;
        if (scope === "series" && appointment.seriesId) {
            // Cancel entire series from this appointment onwards
            result = await this.repository.cancelSeries(appointment.seriesId, appointment.seriesIndex ?? 0, user.id);
            
            logger.info({
                tenantId: appointment.tenantId,
                seriesId: appointment.seriesId,
                fromIndex: appointment.seriesIndex,
                cancelledCount: result.count,
                userId: user.id,
                requiresOverride: policyCheck.requiresOverride
            }, 'Recurring appointment series cancelled');
        } else {
            // Cancel single appointment
            result = await this.repository.updateStatus(id, AppointmentStatus.CANCELLED, user.id, notes);
        }

        // Timeline & Audit
        await timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType: overrideReason ? TimelineEvent.ADMIN_OVERRIDE : TimelineEvent.CANCELLED,
            performedBy: user.id,
            note: notes,
            metadata: { 
                previousStatus: appointment.status, 
                scope,
                overrideReason,
                requiresOverride: policyCheck.requiresOverride,
                ...(scope === 'series' && { 
                    seriesId: appointment.seriesId, 
                    fromIndex: appointment.seriesIndex 
                })
            }
        });

        auditService.logEvent({
            tenantId: appointment.tenantId,
            action: "appointment.cancel",
            resourceType: "Appointment",
            resourceId: id,
            correlationId: `cancel-${id}-${Date.now()}`,
            userId: user.id,
            before: { status: appointment.status },
            after: { status: AppointmentStatus.CANCELLED },
            reason: notes
        });

        return result;
    }

    async rescheduleAppointment(
        id: string,
        scope: "single" | "series",
        newStartTimeUtc: string,
        newEndTimeUtc: string,
        user: { id: string; role: UserRole },
        overrideReason?: string
    ) {
        const appointment = await this.repository.findById(id);
        if (!appointment) throw new Error("APPOINTMENT_NOT_FOUND");

        const config = await configService.getConfig(appointment.tenantId);
        const rescheduleCount = await this.repository.countReschedules(id);
        
        // Enhanced policy check with admin override support
        const policyCheck = policyService.canReschedule(
            rescheduleCount,
            config,
            user,
            appointment.id,
            appointment.tenantId,
            overrideReason
        );

        if (!policyCheck.allowed) {
            throw new Error(policyCheck.reason || "Reschedule not allowed");
        }

        const newStart = new Date(newStartTimeUtc);
        const newEnd = new Date(newEndTimeUtc);
        const notes = overrideReason ? `[OVERRIDE] ${overrideReason}` : undefined;

        // Enhanced conflict detection
        const conflictCheck = await this.checkRescheduleConflict(
            appointment.id,
            appointment.staffId,
            newStart,
            newEnd,
            appointment.tenantId
        );

        if (conflictCheck.hasConflict) {
            throw new Error(`RESCHEDULE_CONFLICT: ${conflictCheck.conflictReason}`);
        }

        let result;
        if (scope === "series" && appointment.seriesId) {
            // Reschedule entire series from this appointment onwards
            result = await this.repository.rescheduleSeries(
                appointment.seriesId, 
                appointment.seriesIndex ?? 0, 
                newStart, 
                newEnd, 
                user.id
            );
            
            logger.info({
                tenantId: appointment.tenantId,
                seriesId: appointment.seriesId,
                fromIndex: appointment.seriesIndex,
                newStartTime: newStartTimeUtc,
                rescheduledCount: result.count,
                userId: user.id,
                requiresOverride: policyCheck.requiresOverride
            }, 'Recurring appointment series rescheduled');
        } else {
            // Reschedule single appointment
            result = await this.repository.rescheduleSingle(id, newStart, newEnd, user.id, notes);
        }

        // Timeline & Audit
        await timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType: overrideReason ? TimelineEvent.ADMIN_OVERRIDE : TimelineEvent.RESCHEDULED,
            performedBy: user.id,
            note: notes,
            metadata: {
                previousStart: appointment.startTimeUtc,
                newStart,
                overrideReason,
                scope,
                conflictCheck: conflictCheck,
                requiresOverride: policyCheck.requiresOverride,
                ...(scope === 'series' && { 
                    seriesId: appointment.seriesId, 
                    fromIndex: appointment.seriesIndex 
                })
            }
        });

        auditService.logEvent({
            tenantId: appointment.tenantId,
            action: "appointment.reschedule",
            resourceType: "Appointment",
            resourceId: id,
            correlationId: `reschedule-${id}-${Date.now()}`,
            userId: user.id,
            before: { startTimeUtc: appointment.startTimeUtc },
            after: { startTimeUtc: newStart },
            reason: notes
        });

        return result;
    }

    private async checkRescheduleConflict(
        appointmentId: string,
        staffId: string,
        newStart: Date,
        newEnd: Date,
        tenantId: string
    ): Promise<{ hasConflict: boolean; conflictReason?: string }> {
        // Check for existing appointments at the new time
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                id: { not: appointmentId }, // Exclude current appointment
                tenantId,
                staffId,
                status: { not: AppointmentStatus.CANCELLED },
                OR: [
                    {
                        startTimeUtc: { lt: newEnd },
                        endTimeUtc: { gt: newStart }
                    }
                ]
            }
        });

        if (existingAppointments.length > 0) {
            return {
                hasConflict: true,
                conflictReason: `Slot conflicts with existing appointment(s): ${existingAppointments.map(a => a.referenceId).join(', ')}`
            };
        }

        // Check for active slot locks at the new time
        const existingLocks = await prisma.slotLock.findMany({
            where: {
                tenantId,
                staffId,
                startTimeUtc: { lt: newEnd },
                endTimeUtc: { gt: newStart },
                expiresAt: { gt: new Date() }
            }
        });

        if (existingLocks.length > 0) {
            return {
                hasConflict: true,
                conflictReason: `Slot is temporarily locked by another booking attempt`
            };
        }

        return { hasConflict: false };
    }

    async createManualBooking(data: {
        tenantId: string;
        serviceId: string;
        staffId: string;
        customerId: string;
        startTimeUtc: string;
        endTimeUtc: string;
        notes?: string;
        createdBy: string;
        ipAddress: string;
    }) {
        const referenceId = await this.generateReferenceId(data.tenantId);

        // Enhanced conflict detection for manual booking
        const conflictCheck = await this.checkBookingConflict(
            data.staffId,
            new Date(data.startTimeUtc),
            new Date(data.endTimeUtc),
            data.tenantId
        );

        if (conflictCheck.hasConflict) {
            throw new Error(`BOOKING_CONFLICT: ${conflictCheck.conflictReason}`);
        }

        try {
            const appointment = await this.repository.createManualBooking({
                tenantId: data.tenantId,
                serviceId: data.serviceId,
                staffId: data.staffId,
                customerId: data.customerId,
                startTimeUtc: new Date(data.startTimeUtc),
                endTimeUtc: new Date(data.endTimeUtc),
                referenceId,
                notes: data.notes,
                createdBy: data.createdBy,
                status: AppointmentStatus.CONFIRMED, // Manual bookings are confirmed by default
            });

            // Recording events
            await timelineService.addEvent({
                appointmentId: appointment.id,
                tenantId: data.tenantId,
                eventType: TimelineEvent.CREATED,
                performedBy: data.createdBy,
                note: "Manual booking created by staff",
                metadata: {
                    ipAddress: data.ipAddress,
                    serviceId: data.serviceId,
                    manualBooking: true
                }
            });

            auditService.logEvent({
                tenantId: data.tenantId,
                action: "appointment.manual.create",
                resourceType: "Appointment",
                resourceId: appointment.id,
                correlationId: `manual-${appointment.id}-${Date.now()}`,
                after: appointment,
                ipAddress: data.ipAddress,
                userId: data.createdBy
            });

            logger.info({
                tenantId: data.tenantId,
                appointmentId: appointment.id,
                referenceId,
                createdBy: data.createdBy,
                startTimeUtc: data.startTimeUtc
            }, 'Manual appointment created successfully');

            return appointment;
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new Error("SLOT_TAKEN");
                }
            }
            throw error;
        }
    }

    private async checkBookingConflict(
        staffId: string,
        startTime: Date,
        endTime: Date,
        tenantId: string
    ): Promise<{ hasConflict: boolean; conflictReason?: string }> {
        // Check for existing appointments
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                staffId,
                status: { not: AppointmentStatus.CANCELLED },
                OR: [
                    {
                        startTimeUtc: { lt: endTime },
                        endTimeUtc: { gt: startTime }
                    }
                ]
            }
        });

        if (existingAppointments.length > 0) {
            return {
                hasConflict: true,
                conflictReason: `Slot conflicts with existing appointment(s): ${existingAppointments.map(a => a.referenceId).join(', ')}`
            };
        }

        // Check for active slot locks
        const existingLocks = await prisma.slotLock.findMany({
            where: {
                tenantId,
                staffId,
                startTimeUtc: { lt: endTime },
                endTimeUtc: { gt: startTime },
                expiresAt: { gt: new Date() }
            }
        });

        if (existingLocks.length > 0) {
            return {
                hasConflict: true,
                conflictReason: `Slot is temporarily locked by another booking attempt`
            };
        }

        return { hasConflict: false };
    }

    async getRecurringSeries(seriesId: string) {
        const series = await prisma.recurringAppointmentSeries.findFirst({
            where: { id: seriesId },
            include: {
                appointments: {
                    include: {
                        service: true,
                        staff: true,
                        customer: true,
                        timeline: true
                    },
                    orderBy: { seriesIndex: 'asc' }
                }
            }
        });

        if (!series) {
            throw new Error("SERIES_NOT_FOUND");
        }

        return series;
    }

    async getRecurringSeriesByTenant(tenantId: string, filters?: {
        staffId?: string;
        customerId?: string;
        status?: AppointmentStatus;
        limit?: number;
        offset?: number;
    }) {
        const where: any = { tenantId };
        
        if (filters?.staffId) {
            where.appointments = { some: { staffId: filters.staffId } };
        }
        
        if (filters?.customerId) {
            where.appointments = { some: { customerId: filters.customerId } };
        }

        const series = await prisma.recurringAppointmentSeries.findMany({
            where,
            include: {
                appointments: {
                    where: filters?.status ? { status: filters.status } : undefined,
                    include: {
                        service: true,
                        staff: true,
                        customer: true
                    },
                    orderBy: { seriesIndex: 'asc' }
                },
                _count: {
                    select: {
                        appointments: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0
        });

        return series;
    }
}
