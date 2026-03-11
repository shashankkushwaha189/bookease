import { z } from 'zod';

// Policy types
export enum PolicyType {
  CANCELLATION_WINDOW = 'CANCELLATION_WINDOW',
  RESCHEDULE_LIMIT = 'RESCHEDULE_LIMIT',
  GRACE_NO_SHOW_PERIOD = 'GRACE_NO_SHOW_PERIOD',
  BOOKING_WINDOW = 'BOOKING_WINDOW',
  PAYMENT_POLICY = 'PAYMENT_POLICY',
}

// Policy action types
export enum PolicyAction {
  ALLOW = 'ALLOW',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
}

// Override reason types
export enum OverrideReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  STAFF_ERROR = 'STAFF_ERROR',
  EMERGENCY = 'EMERGENCY',
  SPECIAL_CASE = 'SPECIAL_CASE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  OTHER = 'OTHER',
}

// Policy rule schema
export const policyRuleSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  type: z.nativeEnum(PolicyType),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(100).default(50), // Higher priority = more important
  
  // Policy-specific configuration
  config: z.union([
    // Cancellation window policy
    z.object({
      hoursBeforeAppointment: z.number().min(0).max(168), // Up to 1 week
      allowAdminOverride: z.boolean().default(true),
      penaltyFee: z.number().min(0).optional(),
      penaltyType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    }),
    
    // Reschedule limit policy
    z.object({
      maxReschedules: z.number().min(0).max(10),
      timeWindowHours: z.number().min(1).max(168), // Window for counting reschedules
      allowAdminOverride: z.boolean().default(true),
      requireReason: z.boolean().default(false),
    }),
    
    // Grace no-show period
    z.object({
      graceMinutes: z.number().min(0).max(60), // Minutes after appointment time
      autoCancelMinutes: z.number().min(1).max(1440), // Minutes to wait before cancelling
      allowAdminOverride: z.boolean().default(true),
      notifyStaff: z.boolean().default(true),
      notifyCustomer: z.boolean().default(true),
    }),
    
    // Booking window policy
    z.object({
      minHoursInAdvance: z.number().min(0).max(168), // Min hours before booking
      maxDaysInAdvance: z.number().min(1).max(365), // Max days in advance
      allowAdminOverride: z.boolean().default(true),
    }),
    
    // Payment policy
    z.object({
      requireDeposit: z.boolean().default(false),
      depositAmount: z.number().min(0),
      depositType: z.enum(['FIXED', 'PERCENTAGE']),
      refundPolicy: z.enum(['FULL', 'PARTIAL', 'NONE']),
      refundHoursBefore: z.number().min(0),
    }),
  ]),
  
  // Policy conditions
  conditions: z.object({
    serviceIds: z.array(z.string().uuid()).optional(), // Apply to specific services
    staffIds: z.array(z.string().uuid()).optional(), // Apply to specific staff
    customerTags: z.array(z.string()).optional(), // Apply to customers with tags
    appointmentTypes: z.array(z.string()).optional(), // Apply to specific appointment types
    timeRanges: z.array(z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(1).max(24),
      daysOfWeek: z.array(z.number().min(0).max(6)),
    })).optional(),
  }).optional(),
  
  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

// Policy evaluation request schema
export const policyEvaluationRequestSchema = z.object({
  action: z.enum(['CANCEL', 'RESCHEDULE', 'BOOK', 'CHECK_IN']),
  appointmentId: z.string().uuid().optional(),
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerId: z.string().uuid(),
  appointmentTime: z.string().datetime(),
  requestedTime: z.string().datetime().optional(), // For reschedule requests
  userId: z.string().uuid(), // User performing the action
  userRole: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
  context: z.record(z.string(), z.any()).optional(), // Additional context
});

// Policy evaluation result schema
export const policyEvaluationResultSchema = z.object({
  action: z.enum(['ALLOW', 'WARN', 'BLOCK', 'REQUIRE_APPROVAL']),
  message: z.string(),
  policies: z.array(z.object({
    policyId: z.string(),
    policyName: z.string(),
    action: z.nativeEnum(PolicyAction),
    message: z.string(),
    canOverride: z.boolean(),
    overrideReasons: z.array(z.nativeEnum(OverrideReason)),
  })),
  overrideRequired: z.boolean(),
  warnings: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Policy override schema
export const policyOverrideSchema = z.object({
  policyEvaluationId: z.string().uuid(),
  policyId: z.string().uuid(),
  reason: z.nativeEnum(OverrideReason),
  reasonText: z.string().min(1).max(500),
  userId: z.string().uuid(),
  userRole: z.enum(['STAFF', 'ADMIN']),
});

// Policy preview schema
export const policyPreviewSchema = z.object({
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerId: z.string().uuid(),
  appointmentTime: z.string().datetime(),
  action: z.enum(['BOOK', 'CANCEL', 'RESCHEDULE']),
});

// Policy metrics schema
export const policyMetricsSchema = z.object({
  totalEvaluations: z.number(),
  blockedActions: z.number(),
  overriddenActions: z.number(),
  averageEvaluationTime: z.number(),
  policyViolations: z.array(z.object({
    policyId: z.string(),
    policyName: z.string(),
    violationCount: z.number(),
    lastViolation: z.string().datetime(),
  })),
});

// Type exports
export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type PolicyEvaluationRequest = z.infer<typeof policyEvaluationRequestSchema>;
export type PolicyEvaluationResult = z.infer<typeof policyEvaluationResultSchema>;
export type PolicyOverride = z.infer<typeof policyOverrideSchema>;
export type PolicyPreview = z.infer<typeof policyPreviewSchema>;
export type PolicyMetrics = z.infer<typeof policyMetricsSchema>;
