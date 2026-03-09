import { z } from 'zod';

// Time slot representation
export const timeSlotSchema = z.object({
  start: z.string(), // HH:mm format
  end: z.string(),   // HH:mm format
  available: z.boolean().default(true),
  reason: z.string().optional(), // Why slot might be unavailable
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

// Availability request schema
export const availabilityRequestSchema = z.object({
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().datetime(), // ISO 8601 date
  timezone: z.string().optional().default('UTC'),
  duration: z.number().int().min(5).max(480), // Service duration in minutes
  bufferBefore: z.number().int().min(0).max(120).optional(),
  bufferAfter: z.number().int().min(0).max(120).optional(),
  includeBufferInSlot: z.boolean().default(true),
  maxSlots: z.number().int().min(1).max(50).optional().default(20),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;

// Availability response schema
export const availabilityResponseSchema = z.object({
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().datetime(),
  timezone: z.string(),
  slots: z.array(timeSlotSchema),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
    isWorking: z.boolean(),
  }),
  totalSlots: z.number(),
  availableSlots: z.number(),
  generatedAt: z.string().datetime(),
  cacheKey: z.string().optional(),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

// Date override schema (for special working hours)
export const dateOverrideSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().datetime(),
  isWorking: z.boolean().default(true),
  startTime: z.string().optional(), // HH:mm format
  endTime: z.string().optional(),   // HH:mm format
  reason: z.string().optional(),
  createdBy: z.string().min(1),
});

export type DateOverride = z.infer<typeof dateOverrideSchema>;

// Availability cache entry schema
export const availabilityCacheSchema = z.object({
  key: z.string(),
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().datetime(),
  timezone: z.string(),
  duration: z.number().int(),
  slots: z.array(timeSlotSchema),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
    isWorking: z.boolean(),
  }),
  totalSlots: z.number(),
  availableSlots: z.number(),
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type AvailabilityCacheEntry = z.infer<typeof availabilityCacheSchema>;

// Timezone information schema
export const timezoneInfoSchema = z.object({
  timezone: z.string(),
  offset: z.string(), // e.g., "+05:30" or "-08:00"
  isDST: z.boolean(),
  dstOffset: z.string().optional(), // Different offset during DST
});

export type TimezoneInfo = z.infer<typeof timezoneInfoSchema>;

// Performance metrics schema
export const availabilityMetricsSchema = z.object({
  requestCount: z.number(),
  cacheHitRate: z.number(),
  averageGenerationTime: z.number(), // in milliseconds
  concurrentRequests: z.number(),
  errorRate: z.number(),
  lastReset: z.string().datetime(),
});

export type AvailabilityMetrics = z.infer<typeof availabilityMetricsSchema>;
