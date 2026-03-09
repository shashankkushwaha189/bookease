import { z } from 'zod';

export interface BookEaseConfig {
    booking: {
        maxBookingsPerDay: number;     // default: 50
        slotLockDurationMinutes: number; // default: 25
        allowGuestBooking: boolean;    // default: true
        minAdvanceBookingHours: number; // default: 1
        maxAdvanceBookingDays: number;  // default: 30
        requirePhoneConfirmation: boolean; // default: false
        autoCancelUnconfirmedMinutes: number; // default: 15
    };
    cancellation: {
        allowedUntilHoursBefore: number; // default: 24
        maxReschedules: number;          // default: 3
        noShowGracePeriodMinutes: number; // default: 15
        cancellationFeePercentage: number; // default: 0
        allowStaffCancellation: boolean; // default: true
        requireCancellationReason: boolean; // default: false
    };
    features: {
        aiSummaryEnabled: boolean;   // default: false
        loadBalancingEnabled: boolean; // default: false
        recurringEnabled: boolean;   // default: true
        waitlistEnabled: boolean;    // default: false
        smsNotificationsEnabled: boolean; // default: false
        emailNotificationsEnabled: boolean; // default: true
        onlinePaymentsEnabled: boolean; // default: false
        customerPortalEnabled: boolean; // default: true
    };
    staff: {
        canCancelAppointments: boolean; // default: true
        canRescheduleAppointments: boolean; // default: true
        canOverridePolicies: boolean; // default: false
        canManageCustomers: boolean; // default: true
        canViewReports: boolean; // default: false
        canManageServices: boolean; // default: false
        canManageStaff: boolean; // default: false
        maxConcurrentAppointments: number; // default: 1
    };
    notifications: {
        reminderHoursBefore: number[]; // default: [24, 2]
        cancellationEnabled: boolean; // default: true
        rescheduleEnabled: boolean; // default: true
        confirmationEnabled: boolean; // default: true
        noFollowUpEnabled: boolean; // default: true
    };
    businessHours: {
        monday: { isOpen: boolean; openTime: string; closeTime: string };
        tuesday: { isOpen: boolean; openTime: string; closeTime: string };
        wednesday: { isOpen: boolean; openTime: string; closeTime: string };
        thursday: { isOpen: boolean; openTime: string; closeTime: string };
        friday: { isOpen: boolean; openTime: string; closeTime: string };
        saturday: { isOpen: boolean; openTime: string; closeTime: string };
        sunday: { isOpen: boolean; openTime: string; closeTime: string };
    };
}

export const DEFAULT_CONFIG: BookEaseConfig = {
    booking: {
        maxBookingsPerDay: 50,
        slotLockDurationMinutes: 25,
        allowGuestBooking: true,
        minAdvanceBookingHours: 1,
        maxAdvanceBookingDays: 30,
        requirePhoneConfirmation: false,
        autoCancelUnconfirmedMinutes: 15,
    },
    cancellation: {
        allowedUntilHoursBefore: 24,
        maxReschedules: 3,
        noShowGracePeriodMinutes: 15,
        cancellationFeePercentage: 0,
        allowStaffCancellation: true,
        requireCancellationReason: false,
    },
    features: {
        aiSummaryEnabled: false,
        loadBalancingEnabled: false,
        recurringEnabled: true,
        waitlistEnabled: false,
        smsNotificationsEnabled: false,
        emailNotificationsEnabled: true,
        onlinePaymentsEnabled: false,
        customerPortalEnabled: true,
    },
    staff: {
        canCancelAppointments: true,
        canRescheduleAppointments: true,
        canOverridePolicies: false,
        canManageCustomers: true,
        canViewReports: false,
        canManageServices: false,
        canManageStaff: false,
        maxConcurrentAppointments: 1,
    },
    notifications: {
        reminderHoursBefore: [24, 2],
        cancellationEnabled: true,
        rescheduleEnabled: true,
        confirmationEnabled: true,
        noFollowUpEnabled: true,
    },
    businessHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        saturday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
        sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' },
    },
};

// Feature flag utilities
export class FeatureFlags {
    static isEnabled(config: BookEaseConfig, feature: keyof BookEaseConfig['features']): boolean {
        return config.features[feature];
    }

    static getAllFeatures(config: BookEaseConfig): Record<string, boolean> {
        return { ...config.features };
    }

    static enableFeature(config: BookEaseConfig, feature: keyof BookEaseConfig['features']): BookEaseConfig {
        return {
            ...config,
            features: {
                ...config.features,
                [feature]: true,
            },
        };
    }

    static disableFeature(config: BookEaseConfig, feature: keyof BookEaseConfig['features']): BookEaseConfig {
        return {
            ...config,
            features: {
                ...config.features,
                [feature]: false,
            },
        };
    }
}

// Permission utilities
export class StaffPermissions {
    static hasPermission(config: BookEaseConfig, permission: keyof BookEaseConfig['staff']): boolean {
        return config.staff[permission] as boolean;
    }

    static canManageBookings(config: BookEaseConfig): boolean {
        return config.staff.canCancelAppointments && config.staff.canRescheduleAppointments;
    }

    static canManageBusiness(config: BookEaseConfig): boolean {
        return config.staff.canManageCustomers && config.staff.canManageServices && config.staff.canManageStaff;
    }
}

// Booking policy utilities
export class BookingPolicies {
    static isWithinAdvanceWindow(config: BookEaseConfig, appointmentTime: Date): boolean {
        const now = new Date();
        const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= config.booking.minAdvanceBookingHours && 
               hoursDiff <= config.booking.maxAdvanceBookingDays * 24;
    }

    static canCancel(config: BookEaseConfig, appointmentTime: Date, isStaff: boolean = false): boolean {
        if (!isStaff && !config.cancellation.allowStaffCancellation) {
            return false;
        }
        const now = new Date();
        const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= config.cancellation.allowedUntilHoursBefore;
    }

    static isBusinessOpen(config: BookEaseConfig, date: Date): boolean {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
        const dayName = dayNames[date.getDay()];
        const dayConfig = config.businessHours[dayName];
        return dayConfig.isOpen;
    }
}

export const configSchema = z.object({
    booking: z.object({
        maxBookingsPerDay: z.number().int().positive().max(1000),
        slotLockDurationMinutes: z.number().int().positive().max(60),
        allowGuestBooking: z.boolean(),
        minAdvanceBookingHours: z.number().int().nonnegative().max(168), // max 1 week
        maxAdvanceBookingDays: z.number().int().positive().max(365), // max 1 year
        requirePhoneConfirmation: z.boolean(),
        autoCancelUnconfirmedMinutes: z.number().int().nonnegative().max(1440), // max 24 hours
    }),
    cancellation: z.object({
        allowedUntilHoursBefore: z.number().int().nonnegative().max(168), // max 1 week
        maxReschedules: z.number().int().nonnegative().max(10),
        noShowGracePeriodMinutes: z.number().int().nonnegative().max(60),
        cancellationFeePercentage: z.number().min(0).max(100),
        allowStaffCancellation: z.boolean(),
        requireCancellationReason: z.boolean(),
    }),
    features: z.object({
        aiSummaryEnabled: z.boolean(),
        loadBalancingEnabled: z.boolean(),
        recurringEnabled: z.boolean(),
        waitlistEnabled: z.boolean(),
        smsNotificationsEnabled: z.boolean(),
        emailNotificationsEnabled: z.boolean(),
        onlinePaymentsEnabled: z.boolean(),
        customerPortalEnabled: z.boolean(),
    }),
    staff: z.object({
        canCancelAppointments: z.boolean(),
        canRescheduleAppointments: z.boolean(),
        canOverridePolicies: z.boolean(),
        canManageCustomers: z.boolean(),
        canViewReports: z.boolean(),
        canManageServices: z.boolean(),
        canManageStaff: z.boolean(),
        maxConcurrentAppointments: z.number().int().positive().max(10),
    }),
    notifications: z.object({
        reminderHoursBefore: z.array(z.number().int().positive()).max(5),
        cancellationEnabled: z.boolean(),
        rescheduleEnabled: z.boolean(),
        confirmationEnabled: z.boolean(),
        noFollowUpEnabled: z.boolean(),
    }),
    businessHours: z.object({
        monday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        tuesday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        wednesday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        thursday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        friday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        saturday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        sunday: z.object({ isOpen: z.boolean(), openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
    }),
});
