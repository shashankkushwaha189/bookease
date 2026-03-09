"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyMetricsSchema = exports.policyPreviewSchema = exports.policyOverrideSchema = exports.policyEvaluationResultSchema = exports.policyEvaluationRequestSchema = exports.policyRuleSchema = exports.OverrideReason = exports.PolicyAction = exports.PolicyType = void 0;
const zod_1 = require("zod");
// Policy types
var PolicyType;
(function (PolicyType) {
    PolicyType["CANCELLATION_WINDOW"] = "CANCELLATION_WINDOW";
    PolicyType["RESCHEDULE_LIMIT"] = "RESCHEDULE_LIMIT";
    PolicyType["GRACE_NO_SHOW_PERIOD"] = "GRACE_NO_SHOW_PERIOD";
    PolicyType["BOOKING_WINDOW"] = "BOOKING_WINDOW";
    PolicyType["PAYMENT_POLICY"] = "PAYMENT_POLICY";
})(PolicyType || (exports.PolicyType = PolicyType = {}));
// Policy action types
var PolicyAction;
(function (PolicyAction) {
    PolicyAction["ALLOW"] = "ALLOW";
    PolicyAction["WARN"] = "WARN";
    PolicyAction["BLOCK"] = "BLOCK";
    PolicyAction["REQUIRE_APPROVAL"] = "REQUIRE_APPROVAL";
})(PolicyAction || (exports.PolicyAction = PolicyAction = {}));
// Override reason types
var OverrideReason;
(function (OverrideReason) {
    OverrideReason["CUSTOMER_REQUEST"] = "CUSTOMER_REQUEST";
    OverrideReason["STAFF_ERROR"] = "STAFF_ERROR";
    OverrideReason["EMERGENCY"] = "EMERGENCY";
    OverrideReason["SPECIAL_CASE"] = "SPECIAL_CASE";
    OverrideReason["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    OverrideReason["OTHER"] = "OTHER";
})(OverrideReason || (exports.OverrideReason = OverrideReason = {}));
// Policy rule schema
exports.policyRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    type: zod_1.z.nativeEnum(PolicyType),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500),
    isActive: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().min(1).max(100).default(50), // Higher priority = more important
    // Policy-specific configuration
    config: zod_1.z.union([
        // Cancellation window policy
        zod_1.z.object({
            hoursBeforeAppointment: zod_1.z.number().min(0).max(168), // Up to 1 week
            allowAdminOverride: zod_1.z.boolean().default(true),
            penaltyFee: zod_1.z.number().min(0).optional(),
            penaltyType: zod_1.z.enum(['PERCENTAGE', 'FIXED']).optional(),
        }),
        // Reschedule limit policy
        zod_1.z.object({
            maxReschedules: zod_1.z.number().min(0).max(10),
            timeWindowHours: zod_1.z.number().min(1).max(168), // Window for counting reschedules
            allowAdminOverride: zod_1.z.boolean().default(true),
            requireReason: zod_1.z.boolean().default(false),
        }),
        // Grace no-show period
        zod_1.z.object({
            graceMinutes: zod_1.z.number().min(0).max(60), // Minutes after appointment time
            autoCancelMinutes: zod_1.z.number().min(1).max(1440), // Minutes to wait before cancelling
            allowAdminOverride: zod_1.z.boolean().default(true),
            notifyStaff: zod_1.z.boolean().default(true),
            notifyCustomer: zod_1.z.boolean().default(true),
        }),
        // Booking window policy
        zod_1.z.object({
            minHoursInAdvance: zod_1.z.number().min(0).max(168), // Min hours before booking
            maxDaysInAdvance: zod_1.z.number().min(1).max(365), // Max days in advance
            allowAdminOverride: zod_1.z.boolean().default(true),
        }),
        // Payment policy
        zod_1.z.object({
            requireDeposit: zod_1.z.boolean().default(false),
            depositAmount: zod_1.z.number().min(0),
            depositType: zod_1.z.enum(['FIXED', 'PERCENTAGE']),
            refundPolicy: zod_1.z.enum(['FULL', 'PARTIAL', 'NONE']),
            refundHoursBefore: zod_1.z.number().min(0),
        }),
    ]),
    // Policy conditions
    conditions: zod_1.z.object({
        serviceIds: zod_1.z.array(zod_1.z.string().uuid()).optional(), // Apply to specific services
        staffIds: zod_1.z.array(zod_1.z.string().uuid()).optional(), // Apply to specific staff
        customerTags: zod_1.z.array(zod_1.z.string()).optional(), // Apply to customers with tags
        appointmentTypes: zod_1.z.array(zod_1.z.string()).optional(), // Apply to specific appointment types
        timeRanges: zod_1.z.array(zod_1.z.object({
            startHour: zod_1.z.number().min(0).max(23),
            endHour: zod_1.z.number().min(1).max(24),
            daysOfWeek: zod_1.z.array(zod_1.z.number().min(0).max(6)),
        })).optional(),
    }).optional(),
    // Metadata
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string().uuid().optional(),
    updatedBy: zod_1.z.string().uuid().optional(),
});
// Policy evaluation request schema
exports.policyEvaluationRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(['CANCEL', 'RESCHEDULE', 'BOOK', 'CHECK_IN']),
    appointmentId: zod_1.z.string().uuid().optional(),
    staffId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid(),
    appointmentTime: zod_1.z.string().datetime(),
    requestedTime: zod_1.z.string().datetime().optional(), // For reschedule requests
    userId: zod_1.z.string().uuid(), // User performing the action
    userRole: zod_1.z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
    context: zod_1.z.record(zod_1.z.any()).optional(), // Additional context
});
// Policy evaluation result schema
exports.policyEvaluationResultSchema = zod_1.z.object({
    action: zod_1.z.enum(['ALLOW', 'WARN', 'BLOCK', 'REQUIRE_APPROVAL']),
    message: zod_1.z.string(),
    policies: zod_1.z.array(zod_1.z.object({
        policyId: zod_1.z.string(),
        policyName: zod_1.z.string(),
        action: zod_1.z.nativeEnum(PolicyAction),
        message: zod_1.z.string(),
        canOverride: zod_1.z.boolean(),
        overrideReasons: zod_1.z.array(zod_1.z.nativeEnum(OverrideReason)),
    })),
    overrideRequired: zod_1.z.boolean(),
    warnings: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Policy override schema
exports.policyOverrideSchema = zod_1.z.object({
    policyEvaluationId: zod_1.z.string().uuid(),
    reason: zod_1.z.nativeEnum(OverrideReason),
    reasonText: zod_1.z.string().min(1).max(500),
    userId: zod_1.z.string().uuid(),
    userRole: zod_1.z.enum(['STAFF', 'ADMIN']),
});
// Policy preview schema
exports.policyPreviewSchema = zod_1.z.object({
    staffId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid(),
    appointmentTime: zod_1.z.string().datetime(),
    action: zod_1.z.enum(['BOOK', 'CANCEL', 'RESCHEDULE']),
});
// Policy metrics schema
exports.policyMetricsSchema = zod_1.z.object({
    totalEvaluations: zod_1.z.number(),
    blockedActions: zod_1.z.number(),
    overriddenActions: zod_1.z.number(),
    averageEvaluationTime: zod_1.z.number(),
    policyViolations: zod_1.z.array(zod_1.z.object({
        policyId: zod_1.z.string(),
        policyName: zod_1.z.string(),
        violationCount: zod_1.z.number(),
        lastViolation: zod_1.z.string().datetime(),
    })),
});
