"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiUsageTrackingSchema = exports.correlationContextSchema = exports.auditResponseSchema = exports.timelineResponseSchema = exports.auditQuerySchema = exports.timelineQuerySchema = exports.auditLogSchema = exports.timelineEventSchema = exports.AuditUserRole = exports.AuditAction = exports.TimelineEventType = void 0;
const zod_1 = require("zod");
// Timeline event types
var TimelineEventType;
(function (TimelineEventType) {
    TimelineEventType["CREATED"] = "CREATED";
    TimelineEventType["RESCHEDULED"] = "RESCHEDULED";
    TimelineEventType["CANCELLED"] = "CANCELLED";
    TimelineEventType["COMPLETED"] = "COMPLETED";
    TimelineEventType["NO_SHOW"] = "NO_SHOW";
    TimelineEventType["CONFIRMED"] = "CONFIRMED";
    TimelineEventType["CHECKED_IN"] = "CHECKED_IN";
    TimelineEventType["AI_SUMMARY_GENERATED"] = "AI_SUMMARY_GENERATED";
    TimelineEventType["PAYMENT_PROCESSED"] = "PAYMENT_PROCESSED";
    TimelineEventType["REMINDER_SENT"] = "REMINDER_SENT";
    TimelineEventType["NOTE_ADDED"] = "NOTE_ADDED";
    TimelineEventType["STATUS_CHANGED"] = "STATUS_CHANGED";
})(TimelineEventType || (exports.TimelineEventType = TimelineEventType = {}));
// Audit action types
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["READ"] = "READ";
    AuditAction["CANCEL"] = "CANCEL";
    AuditAction["RESCHEDULE"] = "RESCHEDULE";
    AuditAction["COMPLETE"] = "COMPLETE";
    AuditAction["NO_SHOW"] = "NO_SHOW";
    AuditAction["CHECK_IN"] = "CHECK_IN";
    AuditAction["GENERATE_AI_SUMMARY"] = "GENERATE_AI_SUMMARY";
    AuditAction["SEND_REMINDER"] = "SEND_REMINDER";
    AuditAction["PROCESS_PAYMENT"] = "PROCESS_PAYMENT";
    AuditAction["OVERRIDE_POLICY"] = "OVERRIDE_POLICY";
    AuditAction["MANUAL_BOOKING"] = "MANUAL_BOOKING";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
// User roles for audit
var AuditUserRole;
(function (AuditUserRole) {
    AuditUserRole["CUSTOMER"] = "CUSTOMER";
    AuditUserRole["STAFF"] = "STAFF";
    AuditUserRole["ADMIN"] = "ADMIN";
    AuditUserRole["SYSTEM"] = "SYSTEM";
    AuditUserRole["AI_AGENT"] = "AI_AGENT";
})(AuditUserRole || (exports.AuditUserRole = AuditUserRole = {}));
// Timeline event schema
exports.timelineEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    appointmentId: zod_1.z.string().uuid(),
    eventType: zod_1.z.nativeEnum(TimelineEventType),
    timestamp: zod_1.z.string().datetime(),
    userId: zod_1.z.string().uuid(),
    userRole: zod_1.z.nativeEnum(AuditUserRole),
    data: zod_1.z.record(zod_1.z.any()).optional(), // Event-specific data
    metadata: zod_1.z.object({
        correlationId: zod_1.z.string().uuid(),
        ipAddress: zod_1.z.string().ip().optional(),
        userAgent: zod_1.z.string().optional(),
        sessionId: zod_1.z.string().optional(),
    }).optional(),
    previousState: zod_1.z.record(zod_1.z.any()).optional(), // Previous appointment state
    newState: zod_1.z.record(zod_1.z.any()).optional(), // New appointment state
    reason: zod_1.z.string().max(500).optional(),
    isSystemGenerated: zod_1.z.boolean().default(false),
    createdAt: zod_1.z.string().datetime().optional(),
});
// Audit log schema
exports.auditLogSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    action: zod_1.z.nativeEnum(AuditAction),
    entityType: zod_1.z.string(), // 'appointment', 'customer', 'staff', 'service', 'policy'
    entityId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    userRole: zod_1.z.nativeEnum(AuditUserRole),
    timestamp: zod_1.z.string().datetime(),
    details: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.object({
        correlationId: zod_1.z.string().uuid(),
        ipAddress: zod_1.z.string().ip().optional(),
        userAgent: zod_1.z.string().optional(),
        sessionId: zod_1.z.string().optional(),
        requestId: zod_1.z.string().optional(),
        apiEndpoint: zod_1.z.string().optional(),
        httpMethod: zod_1.z.string().optional(),
        responseTime: zod_1.z.number().optional(),
        statusCode: zod_1.z.number().optional(),
    }),
    success: zod_1.z.boolean().default(true),
    errorMessage: zod_1.z.string().optional(),
    aiUsage: zod_1.z.object({
        model: zod_1.z.string().optional(),
        tokensUsed: zod_1.z.number().optional(),
        processingTime: zod_1.z.number().optional(),
        confidence: zod_1.z.number().optional(),
    }).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
});
// Timeline query schema
exports.timelineQuerySchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
    eventTypes: zod_1.z.array(zod_1.z.nativeEnum(TimelineEventType)).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    userId: zod_1.z.string().uuid().optional(),
    userRole: zod_1.z.nativeEnum(AuditUserRole).optional(),
});
// Audit query schema
exports.auditQuerySchema = zod_1.z.object({
    entityType: zod_1.z.string().optional(),
    entityId: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid().optional(),
    userRole: zod_1.z.nativeEnum(AuditUserRole).optional(),
    action: zod_1.z.nativeEnum(AuditAction).optional(),
    correlationId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
    includeFailures: zod_1.z.boolean().default(false),
});
// Timeline response schema
exports.timelineResponseSchema = zod_1.z.object({
    events: zod_1.z.array(exports.timelineEventSchema),
    total: zod_1.z.number(),
    hasMore: zod_1.z.boolean(),
    appointmentId: zod_1.z.string().uuid(),
    summary: zod_1.z.object({
        created: zod_1.z.string().datetime().optional(),
        lastModified: zod_1.z.string().datetime().optional(),
        statusChanges: zod_1.z.number(),
        reschedules: zod_1.z.number(),
        cancellations: zod_1.z.number(),
        completions: zod_1.z.number(),
        noShows: zod_1.z.number(),
        aiSummaries: zod_1.z.number(),
    }),
});
// Audit response schema
exports.auditResponseSchema = zod_1.z.object({
    logs: zod_1.z.array(exports.auditLogSchema),
    total: zod_1.z.number(),
    hasMore: zod_1.z.boolean(),
    summary: zod_1.z.object({
        totalActions: zod_1.z.number(),
        successfulActions: zod_1.z.number(),
        failedActions: zod_1.z.number(),
        aiUsage: zod_1.z.object({
            totalRequests: zod_1.z.number(),
            totalTokens: zod_1.z.number(),
            averageProcessingTime: zod_1.z.number(),
            averageConfidence: zod_1.z.number(),
        }),
        topActions: zod_1.z.array(zod_1.z.object({
            action: zod_1.z.nativeEnum(AuditAction),
            count: zod_1.z.number(),
        })),
        topUsers: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            actionCount: zod_1.z.number(),
        })),
    }),
});
// Correlation context schema
exports.correlationContextSchema = zod_1.z.object({
    correlationId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    userRole: zod_1.z.nativeEnum(AuditUserRole),
    sessionId: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().ip().optional(),
    userAgent: zod_1.z.string().optional(),
    requestId: zod_1.z.string().optional(),
    startTime: zod_1.z.string().datetime(),
});
// AI usage tracking schema
exports.aiUsageTrackingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    correlationId: zod_1.z.string().uuid(),
    model: zod_1.z.string(),
    prompt: zod_1.z.string(),
    response: zod_1.z.string(),
    tokensUsed: zod_1.z.object({
        prompt: zod_1.z.number(),
        completion: zod_1.z.number(),
        total: zod_1.z.number(),
    }),
    processingTime: zod_1.z.number(), // in milliseconds
    confidence: zod_1.z.number().min(0).max(1),
    cost: zod_1.z.number().optional(), // in USD
    success: zod_1.z.boolean(),
    errorMessage: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
});
