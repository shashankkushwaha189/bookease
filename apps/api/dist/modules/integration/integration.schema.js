"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiTokenQuerySchema = exports.importQuerySchema = exports.availabilityResponseSchema = exports.availabilityRequestSchema = exports.bookingResponseSchema = exports.bookingRequestSchema = exports.rateLimitResponseSchema = exports.rateLimitSchema = exports.apiTokenResponseSchema = exports.apiTokenSchema = exports.staffCsvMappingSchema = exports.serviceCsvMappingSchema = exports.customerCsvMappingSchema = exports.importReportSchema = exports.rowValidationSchema = exports.importJobSchema = exports.RateLimitTier = exports.ApiTokenType = exports.RowValidationStatus = exports.ImportStatus = exports.ImportType = void 0;
const zod_1 = require("zod");
// Import types
var ImportType;
(function (ImportType) {
    ImportType["CUSTOMERS"] = "CUSTOMERS";
    ImportType["SERVICES"] = "SERVICES";
    ImportType["STAFF"] = "STAFF";
})(ImportType || (exports.ImportType = ImportType = {}));
var ImportStatus;
(function (ImportStatus) {
    ImportStatus["PENDING"] = "PENDING";
    ImportStatus["PROCESSING"] = "PROCESSING";
    ImportStatus["COMPLETED"] = "COMPLETED";
    ImportStatus["FAILED"] = "FAILED";
    ImportStatus["PARTIAL_SUCCESS"] = "PARTIAL_SUCCESS";
})(ImportStatus || (exports.ImportStatus = ImportStatus = {}));
var RowValidationStatus;
(function (RowValidationStatus) {
    RowValidationStatus["VALID"] = "VALID";
    RowValidationStatus["INVALID"] = "INVALID";
    RowValidationStatus["DUPLICATE"] = "DUPLICATE";
    RowValidationStatus["MISSING_REQUIRED"] = "MISSING_REQUIRED";
    RowValidationStatus["INVALID_FORMAT"] = "INVALID_FORMAT";
})(RowValidationStatus || (exports.RowValidationStatus = RowValidationStatus = {}));
var ApiTokenType;
(function (ApiTokenType) {
    ApiTokenType["READ_ONLY"] = "READ_ONLY";
    ApiTokenType["READ_WRITE"] = "READ_WRITE";
    ApiTokenType["ADMIN"] = "ADMIN";
    ApiTokenType["INTEGRATION"] = "INTEGRATION";
})(ApiTokenType || (exports.ApiTokenType = ApiTokenType = {}));
var RateLimitTier;
(function (RateLimitTier) {
    RateLimitTier["BASIC"] = "BASIC";
    RateLimitTier["STANDARD"] = "STANDARD";
    RateLimitTier["PREMIUM"] = "PREMIUM";
    RateLimitTier["ENTERPRISE"] = "ENTERPRISE";
})(RateLimitTier || (exports.RateLimitTier = RateLimitTier = {}));
// Import job schema
exports.importJobSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    importType: zod_1.z.nativeEnum(ImportType),
    fileName: zod_1.z.string(),
    fileSize: zod_1.z.number(),
    totalRows: zod_1.z.number(),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(false),
        updateExisting: zod_1.z.boolean().default(false),
        validateOnly: zod_1.z.boolean().default(false),
        batchSize: zod_1.z.number().min(1).max(1000).default(100),
    }),
});
// Row validation result schema
exports.rowValidationSchema = zod_1.z.object({
    rowNumber: zod_1.z.number(),
    status: zod_1.z.nativeEnum(RowValidationStatus),
    data: zod_1.z.record(zod_1.z.any()),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    isValid: zod_1.z.boolean(),
});
// Import report schema
exports.importReportSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    importType: zod_1.z.nativeEnum(ImportType),
    status: zod_1.z.nativeEnum(ImportStatus),
    startedAt: zod_1.z.string().datetime(),
    completedAt: zod_1.z.string().datetime().optional(),
    totalRows: zod_1.z.number(),
    processedRows: zod_1.z.number(),
    successfulRows: zod_1.z.number(),
    failedRows: zod_1.z.number(),
    skippedRows: zod_1.z.number(),
    duplicateRows: zod_1.z.number(),
    validationResults: zod_1.z.array(exports.rowValidationSchema),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    summary: zod_1.z.object({
        successRate: zod_1.z.number(),
        errorRate: zod_1.z.number(),
        processingTime: zod_1.z.number(), // in seconds
    }),
});
// CSV column mappings
exports.customerCsvMappingSchema = zod_1.z.object({
    name: zod_1.z.string().default('name'),
    email: zod_1.z.string().default('email'),
    phone: zod_1.z.string().default('phone'),
    dateOfBirth: zod_1.z.string().default('dateOfBirth'),
    address: zod_1.z.string().default('address'),
    notes: zod_1.z.string().default('notes'),
});
exports.serviceCsvMappingSchema = zod_1.z.object({
    name: zod_1.z.string().default('name'),
    description: zod_1.z.string().default('description'),
    duration: zod_1.z.string().default('duration'),
    price: zod_1.z.string().default('price'),
    category: zod_1.z.string().default('category'),
    color: zod_1.z.string().default('color'),
});
exports.staffCsvMappingSchema = zod_1.z.object({
    name: zod_1.z.string().default('name'),
    email: zod_1.z.string().default('email'),
    phone: zod_1.z.string().default('phone'),
    title: zod_1.z.string().default('title'),
    department: zod_1.z.string().default('department'),
    bio: zod_1.z.string().default('bio'),
});
// API token schema
exports.apiTokenSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    tokenType: zod_1.z.nativeEnum(ApiTokenType),
    rateLimitTier: zod_1.z.nativeEnum(RateLimitTier),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    expiresAt: zod_1.z.string().datetime().optional(),
    allowedIps: zod_1.z.array(zod_1.z.string().ip()).default([]),
    allowedOrigins: zod_1.z.array(zod_1.z.string().url()).default([]),
});
// API token creation response
exports.apiTokenResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    token: zod_1.z.string(), // Only returned on creation
    tokenType: zod_1.z.nativeEnum(ApiTokenType),
    rateLimitTier: zod_1.z.nativeEnum(RateLimitTier),
    permissions: zod_1.z.array(zod_1.z.string()),
    expiresAt: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    lastUsed: zod_1.z.string().datetime().optional(),
});
// Rate limiting schema
exports.rateLimitSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    tokenId: zod_1.z.string().uuid().optional(),
    endpoint: zod_1.z.string(),
    ip: zod_1.z.string().ip().optional(),
    userAgent: zod_1.z.string().optional(),
});
exports.rateLimitResponseSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    remaining: zod_1.z.number(),
    resetTime: zod_1.z.string().datetime(),
    limit: zod_1.z.number(),
    windowMs: zod_1.z.number(),
});
// Booking API schemas
exports.bookingRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
    startTimeUtc: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
    source: zod_1.z.string().default('API'),
});
exports.bookingResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    appointmentId: zod_1.z.string().uuid().optional(),
    referenceId: zod_1.z.string().optional(),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    bookingTime: zod_1.z.number().optional(), // in milliseconds
});
// Availability check schema
exports.availabilityRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    duration: zod_1.z.number(), // in minutes
});
exports.availabilityResponseSchema = zod_1.z.object({
    availableSlots: zod_1.z.array(zod_1.z.object({
        startTimeUtc: zod_1.z.string().datetime(),
        endTimeUtc: zod_1.z.string().datetime(),
        staffId: zod_1.z.string().uuid(),
        staffName: zod_1.z.string(),
    })),
    totalSlots: zod_1.z.number(),
    processingTime: zod_1.z.number(), // in milliseconds
});
// Import query schema
exports.importQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    importType: zod_1.z.nativeEnum(ImportType).optional(),
    status: zod_1.z.nativeEnum(ImportStatus).optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
    sortBy: zod_1.z.enum(['createdAt', 'status', 'successRate']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// API token query schema
exports.apiTokenQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    tokenType: zod_1.z.nativeEnum(ApiTokenType).optional(),
    isActive: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
    sortBy: zod_1.z.enum(['createdAt', 'name', 'lastUsed']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
