"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = exports.DEFAULT_CONFIG = void 0;
const zod_1 = require("zod");
exports.DEFAULT_CONFIG = {
    booking: {
        maxBookingsPerDay: 50,
        slotLockDurationMinutes: 25,
        allowGuestBooking: true,
    },
    cancellation: {
        allowedUntilHoursBefore: 24,
        maxReschedules: 3,
        noShowGracePeriodMinutes: 15,
    },
    features: {
        aiSummaryEnabled: false,
        loadBalancingEnabled: false,
        recurringEnabled: true,
    },
    staff: {
        canCancelAppointments: true,
        canRescheduleAppointments: true,
    },
};
exports.configSchema = zod_1.z.object({
    booking: zod_1.z.object({
        maxBookingsPerDay: zod_1.z.number().int().positive(),
        slotLockDurationMinutes: zod_1.z.number().int().positive(),
        allowGuestBooking: zod_1.z.boolean(),
    }),
    cancellation: zod_1.z.object({
        allowedUntilHoursBefore: zod_1.z.number().int().nonnegative(),
        maxReschedules: zod_1.z.number().int().nonnegative(),
        noShowGracePeriodMinutes: zod_1.z.number().int().nonnegative(),
    }),
    features: zod_1.z.object({
        aiSummaryEnabled: zod_1.z.boolean(),
        loadBalancingEnabled: zod_1.z.boolean(),
        recurringEnabled: zod_1.z.boolean(),
    }),
    staff: zod_1.z.object({
        canCancelAppointments: zod_1.z.boolean(),
        canRescheduleAppointments: zod_1.z.boolean(),
    }),
});
