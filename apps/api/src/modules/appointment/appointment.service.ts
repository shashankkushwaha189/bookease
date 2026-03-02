import { AppointmentRepository } from "./appointment.repository";
import { AppointmentStatus, Prisma, RecurringFrequency, UserRole } from "../../generated/client";
import { prisma } from "../../lib/prisma";
import cron from "node-cron";
import { addWeeks, addMonths } from "date-fns";
import { configService } from "../config/config.service";
import { policyService } from "../policy/policy.service";
import { timelineService } from "../appointment-timeline/timeline.service";
import { auditService } from "../audit/audit.service";
import { TimelineEvent } from "../../generated/client";

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
        // 1. Ensure customer
        let customer = await this.repository.findCustomerByEmail(data.tenantId, data.customer.email);
        if (!customer) {
            customer = await this.repository.createCustomer({
                tenantId: data.tenantId,
                ...data.customer,
            });
        }

        // 2. Generate dates
        const start = new Date(data.startTimeUtc);
        const end = new Date(data.endTimeUtc);
        const duration = end.getTime() - start.getTime();

        const dates = this.generateSeriesDates(start, data.recurring.frequency, data.recurring.occurrences);
        const referenceIds = await this.generateReferenceIds(data.tenantId, dates.length);

        const appointments = dates.map((date, i) => ({
            serviceId: data.serviceId,
            staffId: data.staffId,
            customerId: customer!.id,
            startTimeUtc: date,
            endTimeUtc: new Date(date.getTime() + duration),
            referenceIds, // Pass the whole array, repository will use index i
            notes: data.notes,
            createdBy: data.createdBy,
        }));

        // we need to pass referenceIds differently to the repo or adjust repo
        return this.repository.createRecurringSeries({
            tenantId: data.tenantId,
            frequency: data.recurring.frequency,
            occurrences: data.recurring.occurrences,
            appointments: appointments as any, // repository handles the index
        });
    }

    private generateSeriesDates(start: Date, frequency: RecurringFrequency, count: number): Date[] {
        const dates = [];
        for (let i = 0; i < count; i++) {
            if (frequency === RecurringFrequency.WEEKLY) {
                dates.push(addWeeks(start, i));
            } else if (frequency === RecurringFrequency.BIWEEKLY) {
                dates.push(addWeeks(start, i * 2));
            } else if (frequency === RecurringFrequency.MONTHLY) {
                dates.push(addMonths(start, i));
            }
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
        const expiresAt = new Date(Date.now() + 25 * 60 * 1000);
        return this.repository.createLock({
            ...data,
            expiresAt,
        });
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
            if (policyService.shouldMarkNoShow(app, config)) {
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

                console.log(`Appointment ${app.id} marked as NO_SHOW`);
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
        const policyCheck = policyService.canCancel(appointment, config, user);

        if (!policyCheck.allowed) {
            throw new Error(policyCheck.reason);
        }

        const notes = overrideReason ? `[OVERRIDE] ${overrideReason}` : "Cancelled by user/admin";

        if (scope === "series" && appointment.seriesId) {
            return this.repository.cancelSeries(appointment.seriesId, appointment.seriesIndex ?? 0, user.id);
        }

        const cancelled = await this.repository.updateStatus(id, AppointmentStatus.CANCELLED, user.id, notes);

        // Timeline & Audit
        await timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType: overrideReason ? TimelineEvent.ADMIN_OVERRIDE : TimelineEvent.CANCELLED,
            performedBy: user.id,
            note: notes,
            metadata: { previousStatus: appointment.status, overrideReason }
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

        return cancelled;
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
        const policyCheck = policyService.canReschedule(rescheduleCount, config, user);

        if (!policyCheck.allowed) {
            throw new Error(policyCheck.reason);
        }

        const newStart = new Date(newStartTimeUtc);
        const newEnd = new Date(newEndTimeUtc);
        const notes = overrideReason ? `[OVERRIDE] ${overrideReason}` : undefined;

        if (scope === "series" && appointment.seriesId) {
            return this.repository.rescheduleSeries(appointment.seriesId, appointment.seriesIndex ?? 0, newStart, newEnd, user.id);
        }

        const updated = await this.repository.rescheduleSingle(id, newStart, newEnd, user.id, notes);

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
                overrideReason
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

        return updated;
    }
}
