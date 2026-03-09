"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = exports.BookingPolicies = exports.StaffPermissions = exports.FeatureFlags = exports.DEFAULT_CONFIG = void 0;
const zod_1 = require("zod");
exports.DEFAULT_CONFIG = {
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
class FeatureFlags {
    static isEnabled(config, feature) {
        return config.features[feature];
    }
    static getAllFeatures(config) {
        return { ...config.features };
    }
    static enableFeature(config, feature) {
        return {
            ...config,
            features: {
                ...config.features,
                [feature]: true,
            },
        };
    }
    static disableFeature(config, feature) {
        return {
            ...config,
            features: {
                ...config.features,
                [feature]: false,
            },
        };
    }
}
exports.FeatureFlags = FeatureFlags;
// Permission utilities
class StaffPermissions {
    static hasPermission(config, permission) {
        return config.staff[permission];
    }
    static canManageBookings(config) {
        return config.staff.canCancelAppointments && config.staff.canRescheduleAppointments;
    }
    static canManageBusiness(config) {
        return config.staff.canManageCustomers && config.staff.canManageServices && config.staff.canManageStaff;
    }
}
exports.StaffPermissions = StaffPermissions;
// Booking policy utilities
class BookingPolicies {
    static isWithinAdvanceWindow(config, appointmentTime) {
        const now = new Date();
        const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= config.booking.minAdvanceBookingHours &&
            hoursDiff <= config.booking.maxAdvanceBookingDays * 24;
    }
    static canCancel(config, appointmentTime, isStaff = false) {
        if (!isStaff && !config.cancellation.allowStaffCancellation) {
            return false;
        }
        const now = new Date();
        const hoursDiff = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= config.cancellation.allowedUntilHoursBefore;
    }
    static isBusinessOpen(config, date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        const dayConfig = config.businessHours[dayName];
        return dayConfig.isOpen;
    }
}
exports.BookingPolicies = BookingPolicies;
exports.configSchema = zod_1.z.object({
    booking: zod_1.z.object({
        maxBookingsPerDay: zod_1.z.number().int().positive().max(1000),
        slotLockDurationMinutes: zod_1.z.number().int().positive().max(60),
        allowGuestBooking: zod_1.z.boolean(),
        minAdvanceBookingHours: zod_1.z.number().int().nonnegative().max(168), // max 1 week
        maxAdvanceBookingDays: zod_1.z.number().int().positive().max(365), // max 1 year
        requirePhoneConfirmation: zod_1.z.boolean(),
        autoCancelUnconfirmedMinutes: zod_1.z.number().int().nonnegative().max(1440), // max 24 hours
    }),
    cancellation: zod_1.z.object({
        allowedUntilHoursBefore: zod_1.z.number().int().nonnegative().max(168), // max 1 week
        maxReschedules: zod_1.z.number().int().nonnegative().max(10),
        noShowGracePeriodMinutes: zod_1.z.number().int().nonnegative().max(60),
        cancellationFeePercentage: zod_1.z.number().min(0).max(100),
        allowStaffCancellation: zod_1.z.boolean(),
        requireCancellationReason: zod_1.z.boolean(),
    }),
    features: zod_1.z.object({
        aiSummaryEnabled: zod_1.z.boolean(),
        loadBalancingEnabled: zod_1.z.boolean(),
        recurringEnabled: zod_1.z.boolean(),
        waitlistEnabled: zod_1.z.boolean(),
        smsNotificationsEnabled: zod_1.z.boolean(),
        emailNotificationsEnabled: zod_1.z.boolean(),
        onlinePaymentsEnabled: zod_1.z.boolean(),
        customerPortalEnabled: zod_1.z.boolean(),
    }),
    staff: zod_1.z.object({
        canCancelAppointments: zod_1.z.boolean(),
        canRescheduleAppointments: zod_1.z.boolean(),
        canOverridePolicies: zod_1.z.boolean(),
        canManageCustomers: zod_1.z.boolean(),
        canViewReports: zod_1.z.boolean(),
        canManageServices: zod_1.z.boolean(),
        canManageStaff: zod_1.z.boolean(),
        maxConcurrentAppointments: zod_1.z.number().int().positive().max(10),
    }),
    notifications: zod_1.z.object({
        reminderHoursBefore: zod_1.z.array(zod_1.z.number().int().positive()).max(5),
        cancellationEnabled: zod_1.z.boolean(),
        rescheduleEnabled: zod_1.z.boolean(),
        confirmationEnabled: zod_1.z.boolean(),
        noFollowUpEnabled: zod_1.z.boolean(),
    }),
    businessHours: zod_1.z.object({
        monday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        tuesday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        wednesday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        thursday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        friday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        saturday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
        sunday: zod_1.z.object({ isOpen: zod_1.z.boolean(), openTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), closeTime: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
    }),
});
