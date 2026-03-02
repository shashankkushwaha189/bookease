"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentRouter = void 0;
const express_1 = require("express");
const appointment_controller_1 = require("./appointment.controller");
const timeline_controller_1 = require("../appointment-timeline/timeline.controller");
exports.appointmentRouter = (0, express_1.Router)();
const controller = new appointment_controller_1.AppointmentController();
// Public booking
exports.appointmentRouter.post("/book", controller.createBooking);
exports.appointmentRouter.post("/recurring", controller.createRecurringBooking);
// Slot locking
exports.appointmentRouter.post("/locks", controller.createLock);
exports.appointmentRouter.delete("/locks/:id", controller.releaseLock);
// Admin / Management
exports.appointmentRouter.get("/", controller.getAppointments);
exports.appointmentRouter.get("/:id", controller.getAppointmentById);
exports.appointmentRouter.patch("/:id/status", controller.updateStatus);
exports.appointmentRouter.patch("/:id/reschedule", controller.reschedule);
exports.appointmentRouter.post("/:id/reschedule", controller.reschedule); // Gov-compliant POST
exports.appointmentRouter.delete("/:id", controller.cancel);
exports.appointmentRouter.post("/:id/cancel", controller.cancel); // Gov-compliant POST
exports.appointmentRouter.get("/:id/timeline", timeline_controller_1.timelineController.getTimeline);
