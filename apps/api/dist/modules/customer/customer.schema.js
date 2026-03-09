"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerStatisticsSchema = exports.customerResponseSchema = exports.customerQuerySchema = exports.appointmentHistoryEntrySchema = exports.consentRecordSchema = exports.customerTagSchema = exports.customerNoteSchema = exports.customerProfileSchema = exports.ConsentType = exports.CustomerNoteType = exports.CustomerStatus = void 0;
const zod_1 = require("zod");
// Customer status
var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["ACTIVE"] = "ACTIVE";
    CustomerStatus["INACTIVE"] = "INACTIVE";
    CustomerStatus["SUSPENDED"] = "SUSPENDED";
    CustomerStatus["DELETED"] = "DELETED";
})(CustomerStatus || (exports.CustomerStatus = CustomerStatus = {}));
// Customer note types
var CustomerNoteType;
(function (CustomerNoteType) {
    CustomerNoteType["GENERAL"] = "GENERAL";
    CustomerNoteType["APPOINTMENT"] = "APPOINTMENT";
    CustomerNoteType["PAYMENT"] = "PAYMENT";
    CustomerNoteType["COMPLAINT"] = "COMPLAINT";
    CustomerNoteType["COMPLIMENT"] = "COMPLIMENT";
    CustomerNoteType["MEDICAL"] = "MEDICAL";
    CustomerNoteType["PREFERENCE"] = "PREFERENCE";
    CustomerNoteType["WARNING"] = "WARNING";
})(CustomerNoteType || (exports.CustomerNoteType = CustomerNoteType = {}));
// Consent types
var ConsentType;
(function (ConsentType) {
    ConsentType["PRIVACY_POLICY"] = "PRIVACY_POLICY";
    ConsentType["TERMS_OF_SERVICE"] = "TERMS_OF_SERVICE";
    ConsentType["MARKETING_COMMUNICATIONS"] = "MARKETING_COMMUNICATIONS";
    ConsentType["DATA_PROCESSING"] = "DATA_PROCESSING";
    ConsentType["PHOTOGRAPHY_CONSENT"] = "PHOTOGRAPHY_CONSENT";
    ConsentType["MEDICAL_TREATMENT"] = "MEDICAL_TREATMENT";
    ConsentType["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    ConsentType["SMS_NOTIFICATIONS"] = "SMS_NOTIFICATIONS";
    ConsentType["EMAIL_NOTIFICATIONS"] = "EMAIL_NOTIFICATIONS";
})(ConsentType || (exports.ConsentType = ConsentType = {}));
// Customer profile schema
exports.customerProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    email: zod_1.z.string().email().max(255),
    phone: zod_1.z.string().max(20).optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    address: zod_1.z.object({
        street: zod_1.z.string().max(255).optional(),
        city: zod_1.z.string().max(100).optional(),
        state: zod_1.z.string().max(100).optional(),
        postalCode: zod_1.z.string().max(20).optional(),
        country: zod_1.z.string().max(100).optional(),
    }).optional(),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().max(100).optional(),
        relationship: zod_1.z.string().max(50).optional(),
        phone: zod_1.z.string().max(20).optional(),
        email: zod_1.z.string().email().max(255).optional(),
    }).optional(),
    preferences: zod_1.z.object({
        preferredCommunication: zod_1.z.enum(['EMAIL', 'PHONE', 'SMS', 'MAIL']).optional(),
        preferredLanguage: zod_1.z.string().max(10).default('en'),
        timezone: zod_1.z.string().max(50).optional(),
        notificationSettings: zod_1.z.object({
            appointmentReminders: zod_1.z.boolean().default(true),
            marketingEmails: zod_1.z.boolean().default(false),
            smsNotifications: zod_1.z.boolean().default(true),
            promotionalOffers: zod_1.z.boolean().default(false),
        }).optional(),
    }).optional(),
    medicalInfo: zod_1.z.object({
        allergies: zod_1.z.array(zod_1.z.string()).optional(),
        medications: zod_1.z.array(zod_1.z.string()).optional(),
        conditions: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().max(1000).optional(),
        lastUpdated: zod_1.z.string().datetime().optional(),
    }).optional(),
    status: zod_1.z.nativeEnum(CustomerStatus).default(CustomerStatus.ACTIVE),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    notes: zod_1.z.string().max(1000).optional(),
    consentGiven: zod_1.z.boolean().default(false),
    consentDate: zod_1.z.string().datetime().optional(),
    source: zod_1.z.enum(['WEBSITE', 'PHONE', 'WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'OTHER']).optional(),
    sourceDetails: zod_1.z.string().max(255).optional(),
    lastVisitDate: zod_1.z.string().datetime().optional(),
    totalVisits: zod_1.z.number().default(0),
    totalSpent: zod_1.z.number().default(0),
    averageRating: zod_1.z.number().min(0).max(5).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
    deletedAt: zod_1.z.string().datetime().optional(),
});
// Customer note schema
exports.customerNoteSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    customerId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
    type: zod_1.z.nativeEnum(CustomerNoteType),
    title: zod_1.z.string().min(1).max(200),
    content: zod_1.z.string().min(1).max(2000),
    isPrivate: zod_1.z.boolean().default(false),
    isImportant: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    attachments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        filename: zod_1.z.string(),
        url: zod_1.z.string(),
        size: zod_1.z.number(),
        mimeType: zod_1.z.string(),
    })).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// Customer tag schema
exports.customerTagSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(50),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i).optional(), // Hex color
    description: zod_1.z.string().max(200).optional(),
    isActive: zod_1.z.boolean().default(true),
    usageCount: zod_1.z.number().default(0),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
// Consent record schema
exports.consentRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    customerId: zod_1.z.string().uuid(),
    type: zod_1.z.nativeEnum(ConsentType),
    version: zod_1.z.string().max(50),
    given: zod_1.z.boolean(),
    givenAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    ipAddress: zod_1.z.string().max(45).optional(),
    userAgent: zod_1.z.string().max(500).optional(),
    documentUrl: zod_1.z.string().url().optional(),
    withdrawnAt: zod_1.z.string().datetime().optional(),
    withdrawnBy: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.string().max(500).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
});
// Appointment history entry schema
exports.appointmentHistoryEntrySchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    serviceName: zod_1.z.string(),
    staffId: zod_1.z.string().uuid(),
    staffName: zod_1.z.string(),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    status: zod_1.z.string(),
    referenceId: zod_1.z.string(),
    notes: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().optional(),
    paidAmount: zod_1.z.number().optional(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    review: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Customer query schema
exports.customerQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    search: zod_1.z.string().max(100).optional(),
    status: zod_1.z.nativeEnum(CustomerStatus).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    createdAfter: zod_1.z.string().datetime().optional(),
    createdBefore: zod_1.z.string().datetime().optional(),
    lastVisitAfter: zod_1.z.string().datetime().optional(),
    lastVisitBefore: zod_1.z.string().datetime().optional(),
    hasOutstandingBalance: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
    sortBy: zod_1.z.enum(['name', 'createdAt', 'lastVisitDate', 'totalVisits', 'totalSpent']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Customer response schema
exports.customerResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    phone: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    gender: zod_1.z.string().optional(),
    address: zod_1.z.object({
        street: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        postalCode: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
    }).optional(),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().optional(),
        relationship: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        email: zod_1.z.string().optional(),
    }).optional(),
    preferences: zod_1.z.object({
        preferredCommunication: zod_1.z.string().optional(),
        preferredLanguage: zod_1.z.string().optional(),
        timezone: zod_1.z.string().optional(),
        notificationSettings: zod_1.z.object({
            appointmentReminders: zod_1.z.boolean().optional(),
            marketingEmails: zod_1.z.boolean().optional(),
            smsNotifications: zod_1.z.boolean().optional(),
            promotionalOffers: zod_1.z.boolean().optional(),
        }).optional(),
    }).optional(),
    medicalInfo: zod_1.z.object({
        allergies: zod_1.z.array(zod_1.z.string()).optional(),
        medications: zod_1.z.array(zod_1.z.string()).optional(),
        conditions: zod_1.z.array(zod_1.z.string()).optional(),
        notes: zod_1.z.string().optional(),
        lastUpdated: zod_1.z.string().datetime().optional(),
    }).optional(),
    status: zod_1.z.nativeEnum(CustomerStatus),
    tags: zod_1.z.array(zod_1.z.string()),
    notes: zod_1.z.string().optional(),
    consentGiven: zod_1.z.boolean(),
    consentDate: zod_1.z.string().datetime().optional(),
    source: zod_1.z.string().optional(),
    sourceDetails: zod_1.z.string().optional(),
    lastVisitDate: zod_1.z.string().datetime().optional(),
    totalVisits: zod_1.z.number(),
    totalSpent: zod_1.z.number(),
    averageRating: zod_1.z.number().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    deletedAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.array(exports.customerNoteSchema.extend({
        id: zod_1.z.string().uuid(),
        customerId: zod_1.z.string().uuid(),
        staffId: zod_1.z.string().uuid(),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })).optional(),
    consentRecords: zod_1.z.array(exports.consentRecordSchema.extend({
        id: zod_1.z.string().uuid(),
        customerId: zod_1.z.string().uuid(),
        createdAt: zod_1.z.string().datetime(),
    })).optional(),
    appointmentHistory: zod_1.z.array(exports.appointmentHistoryEntrySchema).optional(),
});
// Customer statistics schema
exports.customerStatisticsSchema = zod_1.z.object({
    totalCustomers: zod_1.z.number(),
    activeCustomers: zod_1.z.number(),
    newCustomersThisMonth: zod_1.z.number(),
    customersWithVisitsThisMonth: zod_1.z.number(),
    averageVisitsPerCustomer: zod_1.z.number(),
    averageSpentPerCustomer: zod_1.z.number(),
    topTags: zod_1.z.array(zod_1.z.object({
        tag: zod_1.z.string(),
        count: zod_1.z.number(),
    })),
    customerSources: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string(),
        count: zod_1.z.number(),
    })),
    customerRetentionRate: zod_1.z.number(),
    customerChurnRate: zod_1.z.number(),
});
