import { z } from 'zod';

// Import types
export enum ImportType {
  CUSTOMERS = 'CUSTOMERS',
  SERVICES = 'SERVICES',
  STAFF = 'STAFF',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
}

export enum RowValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  DUPLICATE = 'DUPLICATE',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  INVALID_FORMAT = 'INVALID_FORMAT',
}

export enum ApiTokenType {
  READ_ONLY = 'READ_ONLY',
  READ_WRITE = 'READ_WRITE',
  ADMIN = 'ADMIN',
  INTEGRATION = 'INTEGRATION',
}

export enum RateLimitTier {
  BASIC = 'BASIC',        // 100 requests/minute
  STANDARD = 'STANDARD',  // 500 requests/minute
  PREMIUM = 'PREMIUM',    // 2000 requests/minute
  ENTERPRISE = 'ENTERPRISE', // 10000 requests/minute
}

// Import job schema
export const importJobSchema = z.object({
  tenantId: z.string().uuid(),
  importType: z.nativeEnum(ImportType),
  fileName: z.string(),
  fileSize: z.number(),
  totalRows: z.number(),
  options: z.object({
    skipDuplicates: z.boolean().default(false),
    updateExisting: z.boolean().default(false),
    validateOnly: z.boolean().default(false),
    batchSize: z.number().min(1).max(1000).default(100),
  }),
});

// Row validation result schema
export const rowValidationSchema = z.object({
  rowNumber: z.number(),
  status: z.nativeEnum(RowValidationStatus),
  data: z.record(z.string(), z.any()),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  isValid: z.boolean(),
});

// Import report schema
export const importReportSchema = z.object({
  jobId: z.string().uuid(),
  importType: z.nativeEnum(ImportType),
  status: z.nativeEnum(ImportStatus),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  totalRows: z.number(),
  processedRows: z.number(),
  successfulRows: z.number(),
  failedRows: z.number(),
  skippedRows: z.number(),
  duplicateRows: z.number(),
  validationResults: z.array(rowValidationSchema),
  errors: z.array(z.string()).default([]),
  summary: z.object({
    successRate: z.number(),
    errorRate: z.number(),
    processingTime: z.number(), // in seconds
  }),
});

// CSV column mappings
export const customerCsvMappingSchema = z.object({
  name: z.string().default('name'),
  email: z.string().default('email'),
  phone: z.string().default('phone'),
  dateOfBirth: z.string().default('dateOfBirth'),
  address: z.string().default('address'),
  notes: z.string().default('notes'),
});

export const serviceCsvMappingSchema = z.object({
  name: z.string().default('name'),
  description: z.string().default('description'),
  duration: z.string().default('duration'),
  price: z.string().default('price'),
  category: z.string().default('category'),
  color: z.string().default('color'),
});

export const staffCsvMappingSchema = z.object({
  name: z.string().default('name'),
  email: z.string().default('email'),
  phone: z.string().default('phone'),
  title: z.string().default('title'),
  department: z.string().default('department'),
  bio: z.string().default('bio'),
});

// API token schema
export const apiTokenSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  tokenType: z.nativeEnum(ApiTokenType),
  rateLimitTier: z.nativeEnum(RateLimitTier),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  allowedIps: z.array(z.string()).default([]),
  allowedOrigins: z.array(z.string().url()).default([]),
});

// API token creation response
export const apiTokenResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  token: z.string(), // Only returned on creation
  tokenType: z.nativeEnum(ApiTokenType),
  rateLimitTier: z.nativeEnum(RateLimitTier),
  permissions: z.array(z.string()),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  lastUsed: z.string().datetime().optional(),
});

// Rate limiting schema
export const rateLimitSchema = z.object({
  tenantId: z.string().uuid(),
  tokenId: z.string().uuid().optional(),
  endpoint: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export const rateLimitResponseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number(),
  resetTime: z.string().datetime(),
  limit: z.number(),
  windowMs: z.number(),
});

// Booking API schemas
export const bookingRequestSchema = z.object({
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  startTimeUtc: z.string().datetime(),
  notes: z.string().optional(),
  source: z.string().default('API'),
});

export const bookingResponseSchema = z.object({
  success: z.boolean(),
  appointmentId: z.string().uuid().optional(),
  referenceId: z.string().optional(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  bookingTime: z.number().optional(), // in milliseconds
});

// Availability check schema
export const availabilityRequestSchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number(), // in minutes
});

export const availabilityResponseSchema = z.object({
  availableSlots: z.array(z.object({
    startTimeUtc: z.string().datetime(),
    endTimeUtc: z.string().datetime(),
    staffId: z.string().uuid(),
    staffName: z.string(),
  })),
  totalSlots: z.number(),
  processingTime: z.number(), // in milliseconds
});

// Import query schema
export const importQuerySchema = z.object({
  tenantId: z.string().uuid(),
  importType: z.nativeEnum(ImportType).optional(),
  status: z.nativeEnum(ImportStatus).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'status', 'successRate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// API token query schema
export const apiTokenQuerySchema = z.object({
  tenantId: z.string().uuid(),
  tokenType: z.nativeEnum(ApiTokenType).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'name', 'lastUsed']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type ImportJob = z.infer<typeof importJobSchema>;
export type ImportReport = z.infer<typeof importReportSchema>;
export type RowValidationResult = z.infer<typeof rowValidationSchema>;
export type CustomerCsvMapping = z.infer<typeof customerCsvMappingSchema>;
export type ServiceCsvMapping = z.infer<typeof serviceCsvMappingSchema>;
export type StaffCsvMapping = z.infer<typeof staffCsvMappingSchema>;
export type ApiToken = z.infer<typeof apiTokenSchema>;
export type ApiTokenResponse = z.infer<typeof apiTokenResponseSchema>;
export type RateLimit = z.infer<typeof rateLimitSchema>;
export type RateLimitResponse = z.infer<typeof rateLimitResponseSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
export type ImportQuery = z.infer<typeof importQuerySchema>;
export type ApiTokenQuery = z.infer<typeof apiTokenQuerySchema>;
