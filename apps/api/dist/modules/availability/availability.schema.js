"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityMetricsSchema = exports.timezoneInfoSchema = exports.availabilityCacheSchema = exports.dateOverrideSchema = exports.availabilityResponseSchema = exports.availabilityRequestSchema = exports.timeSlotSchema = void 0;
const zod_1 = require("zod");
// Time slot representation
exports.timeSlotSchema = zod_1.z.object({
    start: zod_1.z.string(), // HH:mm format
    end: zod_1.z.string(), // HH:mm format
    available: zod_1.z.boolean().default(true),
    reason: zod_1.z.string().optional(), // Why slot might be unavailable
});
// Availability request schema
exports.availabilityRequestSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(), // ISO 8601 date
    timezone: zod_1.z.string().optional().default('UTC'),
    duration: zod_1.z.number().int().min(5).max(480), // Service duration in minutes
    bufferBefore: zod_1.z.number().int().min(0).max(120).optional(),
    bufferAfter: zod_1.z.number().int().min(0).max(120).optional(),
    includeBufferInSlot: zod_1.z.boolean().default(true),
    maxSlots: zod_1.z.number().int().min(1).max(50).optional().default(20),
});
// Availability response schema
exports.availabilityResponseSchema = zod_1.z.object({
    staffId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    date: zod_1.z.string().datetime(),
    timezone: zod_1.z.string(),
    slots: zod_1.z.array(exports.timeSlotSchema),
    workingHours: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
        isWorking: zod_1.z.boolean(),
    }),
    totalSlots: zod_1.z.number(),
    availableSlots: zod_1.z.number(),
    generatedAt: zod_1.z.string().datetime(),
    cacheKey: zod_1.z.string().optional(),
});
// Date override schema (for special working hours)
exports.dateOverrideSchema = zod_1.z.object({
    staffId: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(),
    isWorking: zod_1.z.boolean().default(true),
    startTime: zod_1.z.string().optional(), // HH:mm format
    endTime: zod_1.z.string().optional(), // HH:mm format
    reason: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().min(1),
});
// Availability cache entry schema
exports.availabilityCacheSchema = zod_1.z.object({
    key: zod_1.z.string(),
    staffId: zod_1.z.string().min(1),
    serviceId: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(),
    timezone: zod_1.z.string(),
    duration: zod_1.z.number().int(),
    slots: zod_1.z.array(exports.timeSlotSchema),
    workingHours: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
        isWorking: zod_1.z.boolean(),
    }),
    totalSlots: zod_1.z.number(),
    availableSlots: zod_1.z.number(),
    generatedAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime(),
});
// Timezone information schema
exports.timezoneInfoSchema = zod_1.z.object({
    timezone: zod_1.z.string(),
    offset: zod_1.z.string(), // e.g., "+05:30" or "-08:00"
    isDST: zod_1.z.boolean(),
    dstOffset: zod_1.z.string().optional(), // Different offset during DST
});
// Performance metrics schema
exports.availabilityMetricsSchema = zod_1.z.object({
    requestCount: zod_1.z.number(),
    cacheHitRate: zod_1.z.number(),
    averageGenerationTime: zod_1.z.number(), // in milliseconds
    concurrentRequests: zod_1.z.number(),
    errorRate: zod_1.z.number(),
    lastReset: zod_1.z.string().datetime(),
});
