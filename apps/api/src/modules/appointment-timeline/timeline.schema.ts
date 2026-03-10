import { z } from 'zod';

// Timeline event types
export enum TimelineEventType {
  CREATED = 'CREATED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  AI_SUMMARY_GENERATED = 'AI_SUMMARY_GENERATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  REMINDER_SENT = 'REMINDER_SENT',
  NOTE_ADDED = 'NOTE_ADDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

// Audit action types
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  CANCEL = 'CANCEL',
  RESCHEDULE = 'RESCHEDULE',
  COMPLETE = 'COMPLETE',
  NO_SHOW = 'NO_SHOW',
  CHECK_IN = 'CHECK_IN',
  GENERATE_AI_SUMMARY = 'GENERATE_AI_SUMMARY',
  SEND_REMINDER = 'SEND_REMINDER',
  PROCESS_PAYMENT = 'PROCESS_PAYMENT',
  OVERRIDE_POLICY = 'OVERRIDE_POLICY',
  MANUAL_BOOKING = 'MANUAL_BOOKING',
}

// User roles for audit
export enum AuditUserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  AI_AGENT = 'AI_AGENT',
}

// Timeline event schema
export const timelineEventSchema = z.object({
  id: z.string().uuid().optional(),
  appointmentId: z.string().uuid(),
  eventType: z.nativeEnum(TimelineEventType),
  timestamp: z.string().datetime(),
  userId: z.string().uuid(),
  userRole: z.nativeEnum(AuditUserRole),
  data: z.record(z.string(), z.any()).optional(), // Event-specific data
  metadata: z.object({
    correlationId: z.string().uuid(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
  previousState: z.record(z.string(), z.any()).optional(), // Previous appointment state
  newState: z.record(z.string(), z.any()).optional(), // New appointment state
  reason: z.string().max(500).optional(),
  isSystemGenerated: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
});

// Audit log schema
export const auditLogSchema = z.object({
  id: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction),
  entityType: z.string(), // 'appointment', 'customer', 'staff', 'service', 'policy'
  entityId: z.string().uuid(),
  userId: z.string().uuid(),
  userRole: z.nativeEnum(AuditUserRole),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.any()),
  metadata: z.object({
    correlationId: z.string().uuid(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
    requestId: z.string().optional(),
    apiEndpoint: z.string().optional(),
    httpMethod: z.string().optional(),
    responseTime: z.number().optional(),
    statusCode: z.number().optional(),
  }),
  success: z.boolean().default(true),
  errorMessage: z.string().optional(),
  aiUsage: z.object({
    model: z.string().optional(),
    tokensUsed: z.number().optional(),
    processingTime: z.number().optional(),
    confidence: z.number().optional(),
  }).optional(),
  createdAt: z.string().datetime().optional(),
});

// Timeline query schema
export const timelineQuerySchema = z.object({
  appointmentId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  eventTypes: z.array(z.nativeEnum(TimelineEventType)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  userRole: z.nativeEnum(AuditUserRole).optional(),
});

// Audit query schema
export const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  userRole: z.nativeEnum(AuditUserRole).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  correlationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeFailures: z.boolean().default(false),
});

// Timeline response schema
export const timelineResponseSchema = z.object({
  events: z.array(timelineEventSchema),
  total: z.number(),
  hasMore: z.boolean(),
  appointmentId: z.string().uuid(),
  summary: z.object({
    created: z.string().datetime().optional(),
    lastModified: z.string().datetime().optional(),
    statusChanges: z.number(),
    reschedules: z.number(),
    cancellations: z.number(),
    completions: z.number(),
    noShows: z.number(),
    aiSummaries: z.number(),
  }),
});

// Audit response schema
export const auditResponseSchema = z.object({
  logs: z.array(auditLogSchema),
  total: z.number(),
  hasMore: z.boolean(),
  summary: z.object({
    totalActions: z.number(),
    successfulActions: z.number(),
    failedActions: z.number(),
    aiUsage: z.object({
      totalRequests: z.number(),
      totalTokens: z.number(),
      averageProcessingTime: z.number(),
      averageConfidence: z.number(),
    }),
    topActions: z.array(z.object({
      action: z.nativeEnum(AuditAction),
      count: z.number(),
    })),
    topUsers: z.array(z.object({
      userId: z.string(),
      actionCount: z.number(),
    })),
  }),
});

// Correlation context schema
export const correlationContextSchema = z.object({
  correlationId: z.string().uuid(),
  userId: z.string().uuid(),
  userRole: z.nativeEnum(AuditUserRole),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  startTime: z.string().datetime(),
});

// AI usage tracking schema
export const aiUsageTrackingSchema = z.object({
  id: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
  model: z.string(),
  prompt: z.string(),
  response: z.string(),
  tokensUsed: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number(),
  }),
  processingTime: z.number(), // in milliseconds
  confidence: z.number().min(0).max(1),
  cost: z.number().optional(), // in USD
  success: z.boolean(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime().optional(),
});

// Type exports
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type AuditResponse = z.infer<typeof auditResponseSchema>;
export type CorrelationContext = z.infer<typeof correlationContextSchema>;
export type AIUsageTracking = z.infer<typeof aiUsageTrackingSchema>;
