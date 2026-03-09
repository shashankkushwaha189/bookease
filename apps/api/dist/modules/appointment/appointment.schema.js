"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentMetricsSchema = exports.bookingAttemptSchema = exports.statusTransitionSchema = exports.appointmentConflictSchema = exports.appointmentResponseSchema = exports.manualBookingSchema = exports.rescheduleAppointmentSchema = exports.slotLockSchema = exports.updateAppointmentSchema = exports.createAppointmentSchema = exports.AppointmentStatus = void 0;
const zod_1 = require("zod");
// Appointment status enum
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["BOOKED"] = "BOOKED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
    AppointmentStatus["RESCHEDULED"] = "RESCHEDULED";
    AppointmentStatus["PENDING_CONFIRMATION"] = "PENDING_CONFIRMATION";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
// Appointment creation schema
exports.createAppointmentSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().min(1),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    notes: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(AppointmentStatus).default(AppointmentStatus.BOOKED),
    requiresConfirmation: zod_1.z.boolean().default(false),
    createdBy: zod_1.z.string().min(1), // User or system creating the appointment
});
// Appointment update schema
exports.updateAppointmentSchema = zod_1.z.object({
    startTimeUtc: zod_1.z.string().datetime().optional(),
    endTimeUtc: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().max(1000).optional(),
    status: zod_1.z.nativeEnum(AppointmentStatus).optional(),
    updatedBy: zod_1.z.string().min(1),
});
// Slot lock schema
exports.slotLockSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().min(1),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    lockType: zod_1.z.enum(['BOOKING', 'RESCHEDULE', 'MANUAL']).default('BOOKING'),
    ttlMinutes: zod_1.z.number().int().min(2).max(5).default(3), // 2-5 minutes TTL
    createdAt: zod_1.z.string().datetime().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string().min(1),
});
// Reschedule request schema
exports.rescheduleAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().min(1),
    newStartTimeUtc: zod_1.z.string().datetime(),
    newEndTimeUtc: zod_1.z.string().datetime(),
    reason: zod_1.z.string().max(500).optional(),
    rescheduledBy: zod_1.z.string().min(1),
    notifyCustomer: zod_1.z.boolean().default(true),
});
// Manual booking schema (for staff creating appointments)
exports.manualBookingSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().min(1),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    notes: zod_1.z.string().max(1000).optional(),
    overrideAvailability: zod_1.z.boolean().default(false), // Override availability checks
    createdBy: zod_1.z.string().min(1),
});
// Appointment response schema
exports.appointmentResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    staffId: zod_1.z.string(),
    serviceId: zod_1.z.string(),
    customerId: zod_1.z.string(),
    referenceId: zod_1.z.string(),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    status: zod_1.z.nativeEnum(AppointmentStatus),
    notes: zod_1.z.string().optional(),
    requiresConfirmation: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    confirmedAt: zod_1.z.string().datetime().optional(),
    cancelledAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    // Related data
    staff: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string().optional(),
    }).optional(),
    service: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        durationMinutes: zod_1.z.number(),
        price: zod_1.z.number().optional(),
    }).optional(),
    customer: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
    }).optional(),
});
// Conflict detection schema
exports.appointmentConflictSchema = zod_1.z.object({
    hasConflict: zod_1.z.boolean(),
    conflictingAppointments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        startTimeUtc: zod_1.z.string().datetime(),
        endTimeUtc: zod_1.z.string().datetime(),
        status: zod_1.z.nativeEnum(AppointmentStatus),
        customerName: zod_1.z.string(),
    })),
    availableSlots: zod_1.z.array(zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
    })).optional(),
});
// Status transition schema
exports.statusTransitionSchema = zod_1.z.object({
    fromStatus: zod_1.z.nativeEnum(AppointmentStatus),
    toStatus: zod_1.z.nativeEnum(AppointmentStatus),
    allowed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
});
// Booking attempt schema
exports.bookingAttemptSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    customerId: zod_1.z.string().min(1),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    attemptAt: zod_1.z.string().datetime(),
    success: zod_1.z.boolean(),
    failureReason: zod_1.z.string().optional(),
    lockId: zod_1.z.string().optional(),
});
// Performance metrics schema
exports.appointmentMetricsSchema = zod_1.z.object({
    totalBookings: zod_1.z.number(),
    successfulBookings: zod_1.z.number(),
    failedBookings: zod_1.z.number(),
    concurrentBookings: zod_1.z.number(),
    averageBookingTime: zod_1.z.number(), // in milliseconds
    lockExpirations: zod_1.z.number(),
    reschedules: zod_1.z.number(),
    cancellations: zod_1.z.number(),
    noShows: zod_1.z.number(),
    lastReset: zod_1.z.string().datetime(),
});
