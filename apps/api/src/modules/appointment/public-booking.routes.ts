import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { bookingConcurrencyMiddleware, bookingRateLimiter } from "../../middleware/booking-concurrency.middleware";

export const publicBookingRouter = Router();
const controller = new AppointmentController();

// Apply concurrency and rate limiting to public booking routes
publicBookingRouter.use(bookingConcurrencyMiddleware);
publicBookingRouter.use(bookingRateLimiter);

// Add tenant ID middleware for public routes (use default tenant)
publicBookingRouter.use((req, res, next) => {
    req.tenantId = (req.headers['x-tenant-id'] as string) || "b18e0808-27d1-4253-aca9-453897585106";
    next();
});

// Public booking routes (no auth/tenant required)
publicBookingRouter.post("/book", controller.createPublicBooking);
publicBookingRouter.post("/recurring", controller.createRecurringBooking);

// Slot locking (public)
publicBookingRouter.post("/locks", controller.createLock);
publicBookingRouter.delete("/locks/:id", controller.releaseLock);

export default publicBookingRouter;
