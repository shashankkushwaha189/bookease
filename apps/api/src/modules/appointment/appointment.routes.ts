import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { timelineController } from "../appointment-timeline/timeline.controller";

export const appointmentRouter = Router();
const controller = new AppointmentController();

// Public booking
appointmentRouter.post("/book", controller.createBooking);
appointmentRouter.post("/recurring", controller.createRecurringBooking);

// Slot locking
appointmentRouter.post("/locks", controller.createLock);
appointmentRouter.delete("/locks/:id", controller.releaseLock);

// Admin / Management
appointmentRouter.get("/", controller.getAppointments);
appointmentRouter.get("/:id", controller.getAppointmentById);
appointmentRouter.patch("/:id/status", controller.updateStatus);
appointmentRouter.patch("/:id/reschedule", controller.reschedule);
appointmentRouter.post("/:id/reschedule", controller.reschedule); // Gov-compliant POST
appointmentRouter.delete("/:id", controller.cancel);
appointmentRouter.post("/:id/cancel", controller.cancel); // Gov-compliant POST
appointmentRouter.get("/:id/timeline", timelineController.getTimeline);
