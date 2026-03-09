import { z } from 'zod';

// Customer status
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

// Customer note types
export enum CustomerNoteType {
  GENERAL = 'GENERAL',
  APPOINTMENT = 'APPOINTMENT',
  PAYMENT = 'PAYMENT',
  COMPLAINT = 'COMPLAINT',
  COMPLIMENT = 'COMPLIMENT',
  MEDICAL = 'MEDICAL',
  PREFERENCE = 'PREFERENCE',
  WARNING = 'WARNING',
}

// Consent types
export enum ConsentType {
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  MARKETING_COMMUNICATIONS = 'MARKETING_COMMUNICATIONS',
  DATA_PROCESSING = 'DATA_PROCESSING',
  PHOTOGRAPHY_CONSENT = 'PHOTOGRAPHY_CONSENT',
  MEDICAL_TREATMENT = 'MEDICAL_TREATMENT',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  SMS_NOTIFICATIONS = 'SMS_NOTIFICATIONS',
  EMAIL_NOTIFICATIONS = 'EMAIL_NOTIFICATIONS',
}

// Customer profile schema
export const customerProfileSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.object({
    street: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().max(100).optional(),
    relationship: z.string().max(50).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(255).optional(),
  }).optional(),
  preferences: z.object({
    preferredCommunication: z.enum(['EMAIL', 'PHONE', 'SMS', 'MAIL']).optional(),
    preferredLanguage: z.string().max(10).default('en'),
    timezone: z.string().max(50).optional(),
    notificationSettings: z.object({
      appointmentReminders: z.boolean().default(true),
      marketingEmails: z.boolean().default(false),
      smsNotifications: z.boolean().default(true),
      promotionalOffers: z.boolean().default(false),
    }).optional(),
  }).optional(),
  medicalInfo: z.object({
    allergies: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional(),
    lastUpdated: z.string().datetime().optional(),
  }).optional(),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.ACTIVE),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional(),
  consentGiven: z.boolean().default(false),
  consentDate: z.string().datetime().optional(),
  source: z.enum(['WEBSITE', 'PHONE', 'WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'OTHER']).optional(),
  sourceDetails: z.string().max(255).optional(),
  lastVisitDate: z.string().datetime().optional(),
  totalVisits: z.number().default(0),
  totalSpent: z.number().default(0),
  averageRating: z.number().min(0).max(5).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
});

// Customer note schema
export const customerNoteSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  staffId: z.string().uuid(),
  type: z.nativeEnum(CustomerNoteType),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  isPrivate: z.boolean().default(false),
  isImportant: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    url: z.string(),
    size: z.number(),
    mimeType: z.string(),
  })).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Customer tag schema
export const customerTagSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(), // Hex color
  description: z.string().max(200).optional(),
  isActive: z.boolean().default(true),
  usageCount: z.number().default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Consent record schema
export const consentRecordSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  type: z.nativeEnum(ConsentType),
  version: z.string().max(50),
  given: z.boolean(),
  givenAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(500).optional(),
  documentUrl: z.string().url().optional(),
  withdrawnAt: z.string().datetime().optional(),
  withdrawnBy: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  createdAt: z.string().datetime().optional(),
});

// Appointment history entry schema
export const appointmentHistoryEntrySchema = z.object({
  appointmentId: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  staffId: z.string().uuid(),
  staffName: z.string(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  status: z.string(),
  referenceId: z.string(),
  notes: z.string().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  review: z.string().optional(),
  createdAt: z.string().datetime(),
});

// Customer query schema
export const customerQuerySchema = z.object({
  tenantId: z.string().uuid(),
  search: z.string().max(100).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  lastVisitAfter: z.string().datetime().optional(),
  lastVisitBefore: z.string().datetime().optional(),
  hasOutstandingBalance: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['name', 'createdAt', 'lastVisitDate', 'totalVisits', 'totalSpent']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Customer response schema
export const customerResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  preferences: z.object({
    preferredCommunication: z.string().optional(),
    preferredLanguage: z.string().optional(),
    timezone: z.string().optional(),
    notificationSettings: z.object({
      appointmentReminders: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      promotionalOffers: z.boolean().optional(),
    }).optional(),
  }).optional(),
  medicalInfo: z.object({
    allergies: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    notes: z.string().optional(),
    lastUpdated: z.string().datetime().optional(),
  }).optional(),
  status: z.nativeEnum(CustomerStatus),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  consentGiven: z.boolean(),
  consentDate: z.string().datetime().optional(),
  source: z.string().optional(),
  sourceDetails: z.string().optional(),
  lastVisitDate: z.string().datetime().optional(),
  totalVisits: z.number(),
  totalSpent: z.number(),
  averageRating: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional(),
  notes: z.array(customerNoteSchema.extend({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    staffId: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })).optional(),
  consentRecords: z.array(consentRecordSchema.extend({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    createdAt: z.string().datetime(),
  })).optional(),
  appointmentHistory: z.array(appointmentHistoryEntrySchema).optional(),
});

// Customer statistics schema
export const customerStatisticsSchema = z.object({
  totalCustomers: z.number(),
  activeCustomers: z.number(),
  newCustomersThisMonth: z.number(),
  customersWithVisitsThisMonth: z.number(),
  averageVisitsPerCustomer: z.number(),
  averageSpentPerCustomer: z.number(),
  topTags: z.array(z.object({
    tag: z.string(),
    count: z.number(),
  })),
  customerSources: z.array(z.object({
    source: z.string(),
    count: z.number(),
  })),
  customerRetentionRate: z.number(),
  customerChurnRate: z.number(),
});

// Type exports
export type CustomerProfile = z.infer<typeof customerProfileSchema>;
export type CustomerNote = z.infer<typeof customerNoteSchema>;
export type CustomerTag = z.infer<typeof customerTagSchema>;
export type ConsentRecord = z.infer<typeof consentRecordSchema>;
export type AppointmentHistoryEntry = z.infer<typeof appointmentHistoryEntrySchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
export type CustomerStatistics = z.infer<typeof customerStatisticsSchema>;
