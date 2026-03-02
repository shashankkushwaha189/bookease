"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
const appointment_repository_1 = require("./appointment.repository");
const client_1 = require("../../generated/client");
const prisma_1 = require("../../lib/prisma");
const node_cron_1 = __importDefault(require("node-cron"));
const date_fns_1 = require("date-fns");
const config_service_1 = require("../config/config.service");
const policy_service_1 = require("../policy/policy.service");
const timeline_service_1 = require("../appointment-timeline/timeline.service");
const audit_service_1 = require("../audit/audit.service");
const client_2 = require("../../generated/client");
class AppointmentService {
    repository;
    constructor() {
        this.repository = new appointment_repository_1.AppointmentRepository();
        this.scheduleCleanupJob();
        this.scheduleNoShowJob();
    }
    async generateReferenceId(tenantId) {
        const ids = await this.generateReferenceIds(tenantId, 1);
        return ids[0];
    }
    async generateReferenceIds(tenantId, count) {
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
    async createBooking(data) {
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
            await timeline_service_1.timelineService.addEvent({
                appointmentId: appointment.id,
                tenantId: data.tenantId,
                eventType: client_2.TimelineEvent.CREATED,
                performedBy: "PUBLIC",
                note: "Appointment booked by customer",
                metadata: {
                    ipAddress: data.ipAddress,
                    serviceId: data.serviceId,
                }
            });
            audit_service_1.auditService.logEvent({
                tenantId: data.tenantId,
                action: "appointment.create",
                resourceType: "Appointment",
                resourceId: appointment.id,
                correlationId,
                after: appointment,
                ipAddress: data.ipAddress,
            });
            return appointment;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new Error("SLOT_TAKEN");
                }
            }
            throw error;
        }
    }
    async createRecurringBooking(data) {
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
            customerId: customer.id,
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
            appointments: appointments, // repository handles the index
        });
    }
    generateSeriesDates(start, frequency, count) {
        const dates = [];
        for (let i = 0; i < count; i++) {
            if (frequency === client_1.RecurringFrequency.WEEKLY) {
                dates.push((0, date_fns_1.addWeeks)(start, i));
            }
            else if (frequency === client_1.RecurringFrequency.BIWEEKLY) {
                dates.push((0, date_fns_1.addWeeks)(start, i * 2));
            }
            else if (frequency === client_1.RecurringFrequency.MONTHLY) {
                dates.push((0, date_fns_1.addMonths)(start, i));
            }
        }
        return dates;
    }
    async createLock(data) {
        const expiresAt = new Date(Date.now() + 25 * 60 * 1000);
        return this.repository.createLock({
            ...data,
            expiresAt,
        });
    }
    async releaseLock(lockId) {
        return this.repository.deleteLock(lockId);
    }
    scheduleCleanupJob() {
        node_cron_1.default.schedule("*/5 * * * *", async () => {
            try {
                await this.repository.deleteExpiredLocks();
            }
            catch (error) {
                console.error("Error in slot lock cleanup job:", error);
            }
        });
    }
    scheduleNoShowJob() {
        // Runs hourly
        node_cron_1.default.schedule("0 * * * *", async () => {
            try {
                console.log("Running hourly NO_SHOW marking job...");
                await this.markNoShows();
            }
            catch (error) {
                console.error("Error in no-show job:", error);
            }
        });
    }
    async markNoShows() {
        // This is a bit complex for a single query if we want policy-aware per tenant
        // For now, we'll get all tenants, get their configs, and process.
        // In a real high-scale app, we'd do this differently.
        const appointments = await prisma_1.prisma.appointment.findMany({
            where: {
                status: { in: [client_1.AppointmentStatus.BOOKED, client_1.AppointmentStatus.CONFIRMED] },
                startTimeUtc: { lt: new Date() }, // Only ones in the past
            },
        });
        for (const app of appointments) {
            const config = await config_service_1.configService.getConfig(app.tenantId);
            if (policy_service_1.policyService.shouldMarkNoShow(app, config)) {
                await this.repository.updateStatus(app.id, client_1.AppointmentStatus.NO_SHOW, undefined, "Marked as NO_SHOW by automated job");
                timeline_service_1.timelineService.addEvent({
                    appointmentId: app.id,
                    tenantId: app.tenantId,
                    eventType: client_2.TimelineEvent.NO_SHOW_MARKED,
                    performedBy: "SYSTEM",
                    note: "Marked as NO_SHOW by automated job"
                }).catch(console.error);
                audit_service_1.auditService.logEvent({
                    tenantId: app.tenantId,
                    action: "appointment.status.no_show",
                    resourceType: "Appointment",
                    resourceId: app.id,
                    correlationId: `noshow-job-${Date.now()}`,
                    after: { status: client_1.AppointmentStatus.NO_SHOW },
                    reason: "Automated grace period check"
                });
                console.log(`Appointment ${app.id} marked as NO_SHOW`);
            }
        }
    }
    async getAppointments(filter) {
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
    async getAppointmentById(id) {
        return this.repository.findById(id);
    }
    async updateAppointmentStatus(id, status, userId, notes) {
        const appointment = await this.repository.findById(id);
        if (!appointment)
            throw new Error("APPOINTMENT_NOT_FOUND");
        const allowedTransitions = {
            [client_1.AppointmentStatus.BOOKED]: [client_1.AppointmentStatus.CONFIRMED, client_1.AppointmentStatus.CANCELLED],
            [client_1.AppointmentStatus.CONFIRMED]: [client_1.AppointmentStatus.COMPLETED, client_1.AppointmentStatus.CANCELLED, client_1.AppointmentStatus.NO_SHOW],
            [client_1.AppointmentStatus.COMPLETED]: [],
            [client_1.AppointmentStatus.CANCELLED]: [],
            [client_1.AppointmentStatus.NO_SHOW]: [],
        };
        if (!allowedTransitions[appointment.status].includes(status)) {
            throw new Error("INVALID_STATUS_TRANSITION");
        }
        const updated = await this.repository.updateStatus(id, status, userId, notes);
        // Timeline
        let eventType = client_2.TimelineEvent.NOTE_ADDED;
        if (status === client_1.AppointmentStatus.CONFIRMED)
            eventType = client_2.TimelineEvent.CONFIRMED;
        if (status === client_1.AppointmentStatus.COMPLETED)
            eventType = client_2.TimelineEvent.COMPLETED;
        if (status === client_1.AppointmentStatus.NO_SHOW)
            eventType = client_2.TimelineEvent.NO_SHOW_MARKED;
        if (status === client_1.AppointmentStatus.CANCELLED)
            eventType = client_2.TimelineEvent.CANCELLED;
        await timeline_service_1.timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType,
            performedBy: userId || "SYSTEM",
            note: notes,
            metadata: { previousStatus: appointment.status, newStatus: status }
        });
        audit_service_1.auditService.logEvent({
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
    async cancelAppointment(id, scope, user, overrideReason) {
        const appointment = await this.repository.findById(id);
        if (!appointment)
            throw new Error("APPOINTMENT_NOT_FOUND");
        const config = await config_service_1.configService.getConfig(appointment.tenantId);
        const policyCheck = policy_service_1.policyService.canCancel(appointment, config, user);
        if (!policyCheck.allowed) {
            throw new Error(policyCheck.reason);
        }
        const notes = overrideReason ? `[OVERRIDE] ${overrideReason}` : "Cancelled by user/admin";
        if (scope === "series" && appointment.seriesId) {
            return this.repository.cancelSeries(appointment.seriesId, appointment.seriesIndex ?? 0, user.id);
        }
        const cancelled = await this.repository.updateStatus(id, client_1.AppointmentStatus.CANCELLED, user.id, notes);
        // Timeline & Audit
        await timeline_service_1.timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType: overrideReason ? client_2.TimelineEvent.ADMIN_OVERRIDE : client_2.TimelineEvent.CANCELLED,
            performedBy: user.id,
            note: notes,
            metadata: { previousStatus: appointment.status, overrideReason }
        });
        audit_service_1.auditService.logEvent({
            tenantId: appointment.tenantId,
            action: "appointment.cancel",
            resourceType: "Appointment",
            resourceId: id,
            correlationId: `cancel-${id}-${Date.now()}`,
            userId: user.id,
            before: { status: appointment.status },
            after: { status: client_1.AppointmentStatus.CANCELLED },
            reason: notes
        });
        return cancelled;
    }
    async rescheduleAppointment(id, scope, newStartTimeUtc, newEndTimeUtc, user, overrideReason) {
        const appointment = await this.repository.findById(id);
        if (!appointment)
            throw new Error("APPOINTMENT_NOT_FOUND");
        const config = await config_service_1.configService.getConfig(appointment.tenantId);
        const rescheduleCount = await this.repository.countReschedules(id);
        const policyCheck = policy_service_1.policyService.canReschedule(rescheduleCount, config, user);
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
        await timeline_service_1.timelineService.addEvent({
            appointmentId: id,
            tenantId: appointment.tenantId,
            eventType: overrideReason ? client_2.TimelineEvent.ADMIN_OVERRIDE : client_2.TimelineEvent.RESCHEDULED,
            performedBy: user.id,
            note: notes,
            metadata: {
                previousStart: appointment.startTimeUtc,
                newStart,
                overrideReason
            }
        });
        audit_service_1.auditService.logEvent({
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
exports.AppointmentService = AppointmentService;
