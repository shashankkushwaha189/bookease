"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicBookingRouter = void 0;
const express_1 = require("express");
const appointment_controller_1 = require("./appointment.controller");
const booking_concurrency_middleware_1 = require("../../middleware/booking-concurrency.middleware");
exports.publicBookingRouter = (0, express_1.Router)();
const controller = new appointment_controller_1.AppointmentController();
// Apply concurrency and rate limiting to public booking routes
exports.publicBookingRouter.use(booking_concurrency_middleware_1.bookingConcurrencyMiddleware);
exports.publicBookingRouter.use(booking_concurrency_middleware_1.bookingRateLimiter);
// Add tenant ID middleware for public routes (use default tenant)
exports.publicBookingRouter.use((req, res, next) => {
    req.tenantId = req.headers['x-tenant-id'] || "b18e0808-27d1-4253-aca9-453897585106";
    next();
});
// Public booking routes (no auth/tenant required)
exports.publicBookingRouter.post("/book", controller.createPublicBooking);
exports.publicBookingRouter.post("/recurring", controller.createRecurringBooking);
// Slot locking (public)
exports.publicBookingRouter.post("/locks", controller.createLock);
exports.publicBookingRouter.delete("/locks/:id", controller.releaseLock);
exports.default = exports.publicBookingRouter;
