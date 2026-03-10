import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { timelineController } from "../appointment-timeline/timeline.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { bookingConcurrencyMiddleware, bookingRateLimiter } from "../../middleware/booking-concurrency.middleware";
import { UserRole } from "@prisma/client";
import availabilityRoutes from "../availability/availability.routes";

export const appointmentRouter = Router();
const controller = new AppointmentController();

// Apply concurrency and rate limiting to all booking-related routes
appointmentRouter.use(bookingConcurrencyMiddleware);
appointmentRouter.use(bookingRateLimiter);

// Public booking routes (no auth/tenant required)
appointmentRouter.post("/book", controller.createPublicBooking);
appointmentRouter.post("/recurring", controller.createRecurringBooking);
appointmentRouter.post("/public/manual", controller.createPublicManualBooking);

// Temporary: Public endpoint to check appointment data (for debugging)
appointmentRouter.get("/debug", controller.getAppointmentsDebug);

// Slot locking
appointmentRouter.post("/locks", controller.createLock);
appointmentRouter.delete("/locks/:id", controller.releaseLock);

// Availability routes (for booking page) - BEFORE tenant middleware for public access
appointmentRouter.use("/availability", availabilityRoutes);

// Apply tenant middleware to all protected routes
appointmentRouter.use(tenantMiddleware);

// Admin / Management (auth required)
appointmentRouter.get("/", authMiddleware, controller.getAppointments);
appointmentRouter.get("/:id", authMiddleware, controller.getAppointmentById);
appointmentRouter.patch("/:id/status", authMiddleware, controller.updateStatus);
appointmentRouter.patch("/:id/reschedule", authMiddleware, controller.reschedule);
appointmentRouter.post("/:id/reschedule", authMiddleware, controller.reschedule); // Gov-compliant POST
appointmentRouter.delete("/:id", authMiddleware, controller.cancel);
appointmentRouter.post("/:id/cancel", authMiddleware, controller.cancel); // Gov-compliant POST

// Manual booking by staff/admin (auth required)
appointmentRouter.post("/manual", 
    authMiddleware, 
    requireRole(UserRole.STAFF), // Staff and above can create manual bookings
    controller.createManualBooking
);

// Timeline endpoints
appointmentRouter.get("/:id/timeline", authMiddleware, timelineController.getTimeline);
appointmentRouter.get("/:id/timeline/summary", authMiddleware, timelineController.getTimelineSummary);
appointmentRouter.post("/:id/timeline/verify-immutability", authMiddleware, requireRole(UserRole.ADMIN), timelineController.verifyImmutability);
appointmentRouter.post("/timeline/test-performance", authMiddleware, requireRole(UserRole.ADMIN), timelineController.testPerformance);

// Recurring appointment series endpoints
appointmentRouter.get("/series/:seriesId", authMiddleware, controller.getRecurringSeries);
appointmentRouter.get("/series", authMiddleware, controller.getRecurringSeriesList);

// Admin monitoring endpoint for booking concurrency stats
appointmentRouter.get("/admin/concurrency-stats",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    (req, res) => {
        const { getBookingConcurrencyStats } = require("../../middleware/booking-concurrency.middleware");
        const stats = getBookingConcurrencyStats();
        res.json({
            success: true,
            data: stats
        });
    }
);
