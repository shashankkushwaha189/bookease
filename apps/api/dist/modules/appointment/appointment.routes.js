"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentRouter = void 0;
const express_1 = require("express");
const appointment_controller_1 = require("./appointment.controller");
const timeline_controller_1 = require("../appointment-timeline/timeline.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const booking_concurrency_middleware_1 = require("../../middleware/booking-concurrency.middleware");
const client_1 = require("@prisma/client");
exports.appointmentRouter = (0, express_1.Router)();
const controller = new appointment_controller_1.AppointmentController();
// Apply concurrency and rate limiting to all booking-related routes
exports.appointmentRouter.use(booking_concurrency_middleware_1.bookingConcurrencyMiddleware);
exports.appointmentRouter.use(booking_concurrency_middleware_1.bookingRateLimiter);
// Apply tenant middleware to all routes
exports.appointmentRouter.use(tenant_middleware_1.tenantMiddleware);
// Public booking (no auth required, but tenant middleware applied)
exports.appointmentRouter.post("/book", controller.createBooking);
exports.appointmentRouter.post("/recurring", controller.createRecurringBooking);
// Slot locking
exports.appointmentRouter.post("/locks", controller.createLock);
exports.appointmentRouter.delete("/locks/:id", controller.releaseLock);
// Manual booking by staff/admin (auth required)
exports.appointmentRouter.post("/manual", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.STAFF), // Staff and above can create manual bookings
controller.createManualBooking);
// Admin / Management (auth required)
exports.appointmentRouter.get("/", auth_middleware_1.authMiddleware, controller.getAppointments);
exports.appointmentRouter.get("/:id", auth_middleware_1.authMiddleware, controller.getAppointmentById);
exports.appointmentRouter.patch("/:id/status", auth_middleware_1.authMiddleware, controller.updateStatus);
exports.appointmentRouter.patch("/:id/reschedule", auth_middleware_1.authMiddleware, controller.reschedule);
exports.appointmentRouter.post("/:id/reschedule", auth_middleware_1.authMiddleware, controller.reschedule); // Gov-compliant POST
exports.appointmentRouter.delete("/:id", auth_middleware_1.authMiddleware, controller.cancel);
exports.appointmentRouter.post("/:id/cancel", auth_middleware_1.authMiddleware, controller.cancel); // Gov-compliant POST
// Timeline endpoints
exports.appointmentRouter.get("/:id/timeline", auth_middleware_1.authMiddleware, timeline_controller_1.timelineController.getTimeline);
exports.appointmentRouter.get("/:id/timeline/summary", auth_middleware_1.authMiddleware, timeline_controller_1.timelineController.getTimelineSummary);
exports.appointmentRouter.post("/:id/timeline/verify-immutability", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), timeline_controller_1.timelineController.verifyImmutability);
exports.appointmentRouter.post("/timeline/test-performance", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), timeline_controller_1.timelineController.testPerformance);
// Recurring appointment series endpoints
exports.appointmentRouter.get("/series/:seriesId", auth_middleware_1.authMiddleware, controller.getRecurringSeries);
exports.appointmentRouter.get("/series", auth_middleware_1.authMiddleware, controller.getRecurringSeriesList);
// Admin monitoring endpoint for booking concurrency stats
exports.appointmentRouter.get("/admin/concurrency-stats", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), (req, res) => {
    const { getBookingConcurrencyStats } = require("../../middleware/booking-concurrency.middleware");
    const stats = getBookingConcurrencyStats();
    res.json({
        success: true,
        data: stats
    });
});
