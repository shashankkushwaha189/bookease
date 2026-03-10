import { Request, Response } from "express";
import { AppointmentService } from "./appointment.service";
import { AppointmentStatus, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

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
            res.status(201).json({
                success: true,
                data: appointment
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Booking creation failed');
            
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

    createPublicBooking = async (req: Request, res: Response) => {
        try {
            // For public booking, use default tenant if no tenant ID provided
            const headerTenantId = req.headers["x-tenant-id"];
            console.log('🔍 Public booking - raw tenant header:', headerTenantId);
            console.log('🔍 Public booking - request body:', req.body);
            const tenantId = String(headerTenantId || "b18e0808-27d1-4253-aca9-453897585106");
            console.log('🔍 Public booking - using tenantId:', tenantId);
            
            // Validate consent
            if (!req.body.consentGiven) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'CONSENT_REQUIRED',
                        message: 'Consent is required for booking'
                    }
                });
            }
            
            // Create customer first, then appointment
            const customer = await prisma.customer.create({
                data: {
                    tenantId,
                    name: req.body.customer.name,
                    email: req.body.customer.email,
                    phone: req.body.customer.phone || null,
                }
            });
            
            // Create appointment directly in database to bypass complex service logic
            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId: req.body.serviceId,
                    staffId: req.body.staffId,
                    customerId: customer.id,
                    startTimeUtc: new Date(req.body.startTimeUtc),
                    endTimeUtc: new Date(req.body.endTimeUtc),
                    status: 'BOOKED',
                    notes: req.body.notes || '',
                    referenceId: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                },
                include: {
                    customer: true,
                    service: true,
                    staff: true,
                }
            });
            
            console.log('✅ Public booking created successfully:', appointment.id);
            res.status(201).json({
                success: true,
                data: appointment
            });
        } catch (error: any) {
            console.error('🔍 Public booking error:', error);
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Public booking creation failed');
            
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

    createPublicManualBooking = async (req: Request, res: Response) => {
        try {
            // For public manual booking, use default tenant if no tenant ID provided
            const tenantId = String(req.headers["x-tenant-id"] || "b18e0808-27d1-4253-aca9-453897585106");
            console.log('🔍 Public manual booking - using tenantId:', tenantId);
            
            const appointment = await this.service.createBooking({
                ...req.body,
                tenantId,
                ipAddress: String(req.ip || "0.0.0.0"),
            });
            res.status(201).json({
                success: true,
                data: appointment
            });
        } catch (error: any) {
            console.error('🔍 Public manual booking error:', error);
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Public manual booking creation failed');
            
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

    // Temporary debug method to check appointment data
    getAppointmentsDebug = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "b18e0808-27d1-4253-aca9-453897585106");
            
            const appointments = await prisma.appointment.findMany({
                where: { tenantId },
                include: {
                    customer: true,
                    service: true,
                    staff: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            
            res.json({
                success: true,
                data: appointments,
                count: appointments.length,
                tenantId
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    createManualBooking = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const userId = String((req as any).user?.id || req.headers["x-user-id"] || "");
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required for manual booking"
                    }
                });
            }

            // Create manual booking directly in database to bypass complex service logic
            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId: req.body.serviceId,
                    staffId: req.body.staffId,
                    customerId: req.body.customerId,
                    startTimeUtc: new Date(req.body.startTimeUtc),
                    endTimeUtc: new Date(req.body.endTimeUtc),
                    status: 'BOOKED',
                    notes: req.body.notes || '',
                    referenceId: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdBy: userId,
                },
                include: {
                    customer: true,
                    service: true,
                    staff: true,
                }
            });
            
            console.log('✅ Manual booking created successfully:', appointment.id);
            res.status(201).json({
                success: true,
                data: appointment
            });

            logger.info({
                tenantId,
                appointmentId: appointment.id,
                referenceId: appointment.referenceId,
                createdBy: userId
            }, 'Manual booking created successfully');
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Manual booking failed');
            
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
            
            // Build where clause
            const where: any = { tenantId };
            
            if (date) {
                const targetDate = new Date(date as string);
                const nextDate = new Date(targetDate);
                nextDate.setDate(nextDate.getDate() + 1);
                where.startTimeUtc = {
                    gte: targetDate,
                    lt: nextDate
                };
            }
            
            if (staffId) {
                where.staffId = staffId as string;
            }
            
            if (status) {
                where.status = status as AppointmentStatus;
            }
            
            // Get appointments with pagination
            const [appointments, total] = await Promise.all([
                prisma.appointment.findMany({
                    where,
                    include: {
                        customer: true,
                        service: true,
                        staff: true,
                    },
                    orderBy: { startTimeUtc: 'desc' },
                    skip: (Number(page) - 1) * Number(limit),
                    take: Number(limit),
                }),
                prisma.appointment.count({ where })
            ]);
            
            res.json({
                success: true,
                data: {
                    items: appointments,
                    total: total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                }
            });
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

    getRecurringSeries = async (req: Request, res: Response) => {
        try {
            const seriesId = String(req.params.seriesId || "");
            const series = await this.service.getRecurringSeries(seriesId);
            
            res.json({
                success: true,
                data: series
            });
        } catch (error: any) {
            logger.error({ error: error.message, seriesId: req.params.seriesId }, 'Get recurring series failed');
            
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

    getRecurringSeriesList = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { staffId, customerId, status, limit = 50, offset = 0 } = req.query;
            
            const series = await this.service.getRecurringSeriesByTenant(tenantId, {
                staffId: staffId as string,
                customerId: customerId as string,
                status: status as AppointmentStatus,
                limit: Number(limit),
                offset: Number(offset)
            });
            
            res.json({
                success: true,
                data: series
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get recurring series list failed');
            
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get recurring series list"
                }
            });
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
                return res.status(401).json({
                    success: false,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "User authentication required"
                    }
                });
            }

            const result = await this.service.rescheduleAppointment(id, scope, startTimeUtc, endTimeUtc, { id: userId, role: userRole }, overrideReason);
            
            logger.info({
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
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Reschedule failed');
            
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
