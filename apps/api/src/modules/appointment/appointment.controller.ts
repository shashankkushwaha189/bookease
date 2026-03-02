import { Request, Response } from "express";
import { AppointmentService } from "./appointment.service";
import { AppointmentStatus, UserRole } from "@prisma/client";

export class AppointmentController {
    private service: AppointmentService;

    constructor() {
        this.service = new AppointmentService();
    }

    createBooking = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const appointment = await this.service.createBooking({
                ...req.body,
                tenantId,
                ipAddress: String(req.ip || "0.0.0.0"),
            });
            res.status(201).json(appointment);
        } catch (error: any) {
            console.error("Booking Error:", error);
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
                return res.status(409).json({ error: "Slot is already booked or locked" });
            }
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };

    createRecurringBooking = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const userId = String(req.headers["x-user-id"] || "");
            const result = await this.service.createRecurringBooking({
                ...req.body,
                tenantId,
                createdBy: userId || undefined,
            });
            res.status(201).json(result);
        } catch (error: any) {
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

    createLock = async (req: Request, res: Response) => {
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
        } catch (error: any) {
            if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
                return res.status(409).json({ error: "Slot already locked" });
            }
            res.status(500).json({ error: error.message });
        }
    };

    releaseLock = async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id || "");
            await this.service.releaseLock(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getAppointments = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { date, staffId, status, isArchived, page = 1, limit = 10 } = req.query;
            const result = await this.service.getAppointments({
                tenantId,
                date: date as string,
                staffId: staffId as string,
                status: status as AppointmentStatus,
                isArchived: isArchived === 'true',
                page: Number(page),
                limit: Number(limit),
            });
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getAppointmentById = async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id || "");
            const appointment = await this.service.getAppointmentById(id);
            if (!appointment) {
                return res.status(404).json({ error: "Appointment not found" });
            }
            res.json(appointment);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    updateStatus = async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id || "");
            const { status, notes } = req.body;
            const userId = String(req.headers["x-user-id"] || "");
            const appointment = await this.service.updateAppointmentStatus(id, status, userId, notes);
            res.json(appointment);
        } catch (error: any) {
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

    reschedule = async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id || "");
            const { startTimeUtc, endTimeUtc, overrideReason } = req.body || {};
            const scope = (req.query.scope as "single" | "series") || "single";

            const userId = String((req as any).user?.id || req.headers["x-user-id"] || "");
            const rawRole = (req as any).user?.role || req.headers["x-user-role"];
            const userRole = (rawRole === "ADMIN" ? "ADMIN" : "STAFF") as UserRole;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const result = await this.service.rescheduleAppointment(id, scope, startTimeUtc, endTimeUtc, { id: userId, role: userRole }, overrideReason);
            res.json(result);
        } catch (error: any) {
            console.error("Reschedule Error:", error);
            if (error.message.startsWith("SLOT_TAKEN:")) {
                const date = error.message.substring("SLOT_TAKEN:".length);
                return res.status(409).json({ error: "Reschedule conflict", conflict: date });
            }
            if (error.message === "Reschedule limit reached") {
                return res.status(403).json({ error: error.message });
            }
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };

    cancel = async (req: Request, res: Response) => {
        try {
            const id = String(req.params.id || "");
            const { overrideReason } = req.body || {};
            const scope = (req.query.scope as "single" | "series") || "single";

            const userId = String((req as any).user?.id || req.headers["x-user-id"] || "");
            const rawRole = (req as any).user?.role || req.headers["x-user-role"];
            const userRole = (rawRole === "ADMIN" ? "ADMIN" : "STAFF") as UserRole;

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
        } catch (error: any) {
            console.error("Cancel Error:", error);
            if (error.message === "Cancellation window has closed") {
                return res.status(403).json({ error: error.message });
            }
            res.status(500).json({ error: error.message, stack: error.stack });
        }
    };
}
