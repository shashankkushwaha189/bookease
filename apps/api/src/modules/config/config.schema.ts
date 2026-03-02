import { z } from 'zod';

export interface BookEaseConfig {
    booking: {
        maxBookingsPerDay: number;     // default: 50
        slotLockDurationMinutes: number; // default: 25
        allowGuestBooking: boolean;    // default: true
    };
    cancellation: {
        allowedUntilHoursBefore: number; // default: 24
        maxReschedules: number;          // default: 3
        noShowGracePeriodMinutes: number; // default: 15
    };
    features: {
        aiSummaryEnabled: boolean;   // default: false
        loadBalancingEnabled: boolean; // default: false
        recurringEnabled: boolean;   // default: true
    };
    staff: {
        canCancelAppointments: boolean; // default: true
        canRescheduleAppointments: boolean; // default: true
    };
}

export const DEFAULT_CONFIG: BookEaseConfig = {
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

export const configSchema = z.object({
    booking: z.object({
        maxBookingsPerDay: z.number().int().positive(),
        slotLockDurationMinutes: z.number().int().positive(),
        allowGuestBooking: z.boolean(),
    }),
    cancellation: z.object({
        allowedUntilHoursBefore: z.number().int().nonnegative(),
        maxReschedules: z.number().int().nonnegative(),
        noShowGracePeriodMinutes: z.number().int().nonnegative(),
    }),
    features: z.object({
        aiSummaryEnabled: z.boolean(),
        loadBalancingEnabled: z.boolean(),
        recurringEnabled: z.boolean(),
    }),
    staff: z.object({
        canCancelAppointments: z.boolean(),
        canRescheduleAppointments: z.boolean(),
    }),
});
