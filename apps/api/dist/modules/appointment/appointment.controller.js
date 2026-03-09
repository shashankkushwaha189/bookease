"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentController = void 0;
const appointment_service_1 = require("./appointment.service");
const logger_1 = require("@bookease/logger");
class AppointmentController {
    service;
    constructor() {
        this.service = new appointment_service_1.AppointmentService();
    }
    createBooking = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const appointment = await this.service.createBooking({
                ...req.body,
                tenantId,
                ipAddress: String(req.ip || "0.0.0.0"),
            });
            res.status(201).json({
                success: true,
                data: appointment
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Booking creation failed');
            if (error.message === "CONSENT_REQUIRED") {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "CONSENT_REQUIRED",
                        message: "Consent must be given to proceed with booking"
                    }
                });
            }
            if (error.message === "SLOT_TAKEN") {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: "SLOT_TAKEN",
                        message: "Slot is already booked or locked"
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create booking"
                }
            });
        }
    };
    createPublicBooking = async (req, res) => {
        try {
            // For public booking, use default tenant if no tenant ID provided
            const tenantId = String(req.headers["x-tenant-id"] || "b18e0808-27d1-4253-aca9-453897585106");
            const appointment = await this.service.createBooking({
                ...req.body,
                tenantId,
                ipAddress: String(req.ip || "0.0.0.0"),
            });
            res.status(201).json({
                success: true,
                data: appointment
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Public booking creation failed');
            if (error.message === "CONSENT_REQUIRED") {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'CONSENT_REQUIRED',
                        message: 'Consent is required for booking'
                    }
                });
            }
            if (error.message === "SLOT_NOT_AVAILABLE") {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'SLOT_NOT_AVAILABLE',
                        message: 'Time slot is no longer available'
                    }
                });
            }
            if (error.message === "STAFF_NOT_AVAILABLE") {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'STAFF_NOT_AVAILABLE',
                        message: 'Staff member is not available at this time'
                    }
                });
            }
            if (error.message === "DUPLICATE_BOOKING") {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_BOOKING',
                        message: 'Duplicate booking detected'
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: 'BOOKING_FAILED',
                    message: 'Failed to create booking'
                }
            });
        }
    };
    createManualBooking = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const userId = String(req.user?.id || req.headers["x-user-id"] || "");
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required for manual booking"
                    }
                });
            }
            const appointment = await this.service.createManualBooking({
                ...req.body,
                tenantId,
                createdBy: userId,
                ipAddress: String(req.ip || "0.0.0.0"),
            });
            logger_1.logger.info({
                tenantId,
                appointmentId: appointment.id,
                referenceId: appointment.referenceId,
                createdBy: userId
            }, 'Manual booking created successfully');
            res.status(201).json({
                success: true,
                data: appointment
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Manual booking failed');
            if (error.message.startsWith("BOOKING_CONFLICT:")) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: "BOOKING_CONFLICT",
                        message: error.message.substring("BOOKING_CONFLICT:".length)
                    }
                });
            }
            if (error.message === "SLOT_TAKEN") {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: "SLOT_TAKEN",
                        message: "Slot is already booked"
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create manual booking"
                }
            });
        }
    };
    createRecurringBooking = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const userId = String(req.headers["x-user-id"] || "");
            const result = await this.service.createRecurringBooking({
                ...req.body,
                tenantId,
                createdBy: userId || undefined,
            });
            res.status(201).json(result);
        }
        catch (error) {
            console.error("Recurring Booking Error:", error);
            if (error.message.startsWith("SLOT_TAKEN:")) {
                const date = error.message.substring("SLOT_TAKEN:".length);
                return res.status(409).json({
                    error: "Slot collision in series",
                    conflictingDate: date,
                });
            }
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };
    createLock = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { staffId, startTimeUtc, endTimeUtc, sessionToken } = req.body;
            const lock = await this.service.createLock({
                tenantId,
                staffId,
                startTimeUtc: new Date(startTimeUtc),
                endTimeUtc: new Date(endTimeUtc),
                sessionToken,
            });
            res.status(201).json(lock);
        }
        catch (error) {
            if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
                return res.status(409).json({ error: "Slot already locked" });
            }
            res.status(500).json({ error: error.message });
        }
    };
    releaseLock = async (req, res) => {
        try {
            const id = String(req.params.id || "");
            await this.service.releaseLock(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
    getAppointments = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { date, staffId, status, isArchived, page = 1, limit = 10 } = req.query;
            const result = await this.service.getAppointments({
                tenantId,
                date: date,
                staffId: staffId,
                status: status,
                isArchived: isArchived === 'true',
                page: Number(page),
                limit: Number(limit),
            });
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
    getAppointmentById = async (req, res) => {
        try {
            const id = String(req.params.id || "");
            const appointment = await this.service.getAppointmentById(id);
            if (!appointment) {
                return res.status(404).json({ error: "Appointment not found" });
            }
            res.json(appointment);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
    updateStatus = async (req, res) => {
        try {
            const id = String(req.params.id || "");
            const { status, notes } = req.body;
            const userId = String(req.headers["x-user-id"] || "");
            const appointment = await this.service.updateAppointmentStatus(id, status, userId, notes);
            res.json(appointment);
        }
        catch (error) {
            if (error.message === "APPOINTMENT_NOT_FOUND") {
                return res.status(404).json({ error: "Appointment not found" });
            }
            if (error.message === "INVALID_STATUS_TRANSITION") {
                return res.status(400).json({ error: "Invalid status transition" });
            }
            console.error("Status Update Error:", error);
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };
    getRecurringSeries = async (req, res) => {
        try {
            const seriesId = String(req.params.seriesId || "");
            const series = await this.service.getRecurringSeries(seriesId);
            res.json({
                success: true,
                data: series
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, seriesId: req.params.seriesId }, 'Get recurring series failed');
            if (error.message === "SERIES_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "SERIES_NOT_FOUND",
                        message: "Recurring series not found"
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get recurring series"
                }
            });
        }
    };
    getRecurringSeriesList = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { staffId, customerId, status, limit = 50, offset = 0 } = req.query;
            const series = await this.service.getRecurringSeriesByTenant(tenantId, {
                staffId: staffId,
                customerId: customerId,
                status: status,
                limit: Number(limit),
                offset: Number(offset)
            });
            res.json({
                success: true,
                data: series
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get recurring series list failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get recurring series list"
                }
            });
        }
    };
    reschedule = async (req, res) => {
        try {
            const id = String(req.params.id || "");
            const { startTimeUtc, endTimeUtc, overrideReason } = req.body || {};
            const scope = req.query.scope || "single";
            const userId = String(req.user?.id || req.headers["x-user-id"] || "");
            const rawRole = req.user?.role || req.headers["x-user-role"];
            const userRole = (rawRole === "ADMIN" ? "ADMIN" : "STAFF");
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required"
                    }
                });
            }
            const result = await this.service.rescheduleAppointment(id, scope, startTimeUtc, endTimeUtc, { id: userId, role: userRole }, overrideReason);
            logger_1.logger.info({
                tenantId: req.headers["x-tenant-id"],
                appointmentId: id,
                userId,
                scope,
                newStartTime: startTimeUtc,
                overrideReason
            }, 'Appointment rescheduled successfully');
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Reschedule failed');
            if (error.message.startsWith("RESCHEDULE_CONFLICT:")) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: "RESCHEDULE_CONFLICT",
                        message: error.message.substring("RESCHEDULE_CONFLICT:".length)
                    }
                });
            }
            if (error.message.startsWith("SLOT_TAKEN:")) {
                const date = error.message.substring("SLOT_TAKEN:".length);
                return res.status(409).json({
                    success: false,
                    error: {
                        code: "SLOT_TAKEN",
                        message: "Reschedule conflict",
                        conflict: date
                    }
                });
            }
            if (error.message === "Reschedule limit reached") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "RESCHEDULE_LIMIT_REACHED",
                        message: error.message
                    }
                });
            }
            if (error.message === "APPOINTMENT_NOT_FOUND") {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: "APPOINTMENT_NOT_FOUND",
                        message: "Appointment not found"
                    }
                });
            }
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to reschedule appointment"
                }
            });
        }
    };
    cancel = async (req, res) => {
        try {
            const id = String(req.params.id || "");
            const { overrideReason } = req.body || {};
            const scope = req.query.scope || "single";
            const userId = String(req.user?.id || req.headers["x-user-id"] || "");
            const rawRole = req.user?.role || req.headers["x-user-role"];
            const userRole = (rawRole === "ADMIN" ? "ADMIN" : "STAFF");
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            if (userRole === "ADMIN" && overrideReason !== undefined) {
                if (!overrideReason || overrideReason.length < 10) {
                    return res.status(400).json({ error: "Admin override requires a reason of at least 10 characters" });
                }
            }
            const result = await this.service.cancelAppointment(id, scope, { id: userId, role: userRole }, overrideReason);
            res.json(result);
        }
        catch (error) {
            console.error("Cancel Error:", error);
            if (error.message === "Cancellation window has closed") {
                return res.status(403).json({ error: error.message });
            }
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };
}
exports.AppointmentController = AppointmentController;
