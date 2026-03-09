"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveResultSchema = exports.archiveSearchSchema = exports.archivalJobSchema = exports.archivalConfigSchema = exports.exportRequestSchema = exports.reportResponseSchema = exports.peakTimesReportDataSchema = exports.noShowReportDataSchema = exports.staffReportDataSchema = exports.serviceReportDataSchema = exports.reportQuerySchema = exports.TimePeriod = exports.ExportFormat = exports.ReportType = void 0;
const zod_1 = require("zod");
// Report types
var ReportType;
(function (ReportType) {
    ReportType["APPOINTMENTS_BY_SERVICE"] = "APPOINTMENTS_BY_SERVICE";
    ReportType["APPOINTMENTS_BY_STAFF"] = "APPOINTMENTS_BY_STAFF";
    ReportType["NO_SHOW_RATE"] = "NO_SHOW_RATE";
    ReportType["PEAK_BOOKING_TIMES"] = "PEAK_BOOKING_TIMES";
    ReportType["REVENUE_SUMMARY"] = "REVENUE_SUMMARY";
    ReportType["CUSTOMER_ANALYTICS"] = "CUSTOMER_ANALYTICS";
    ReportType["STAFF_PERFORMANCE"] = "STAFF_PERFORMANCE";
})(ReportType || (exports.ReportType = ReportType = {}));
// Export formats
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["CSV"] = "CSV";
    ExportFormat["JSON"] = "JSON";
    ExportFormat["PDF"] = "PDF";
    ExportFormat["EXCEL"] = "EXCEL";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
// Time period types
var TimePeriod;
(function (TimePeriod) {
    TimePeriod["DAILY"] = "DAILY";
    TimePeriod["WEEKLY"] = "WEEKLY";
    TimePeriod["MONTHLY"] = "MONTHLY";
    TimePeriod["QUARTERLY"] = "QUARTERLY";
    TimePeriod["YEARLY"] = "YEARLY";
    TimePeriod["CUSTOM"] = "CUSTOM";
})(TimePeriod || (exports.TimePeriod = TimePeriod = {}));
// Report query schema
exports.reportQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    reportType: zod_1.z.nativeEnum(ReportType),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    timePeriod: zod_1.z.nativeEnum(TimePeriod),
    filters: zod_1.z.object({
        serviceIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        staffIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        customerIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        statuses: zod_1.z.array(zod_1.z.string()).optional(),
        appointmentTypes: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    groupBy: zod_1.z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
    includeArchived: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().min(1).max(10000).default(1000),
    offset: zod_1.z.number().min(0).default(0),
});
// Service report data schema
exports.serviceReportDataSchema = zod_1.z.object({
    serviceId: zod_1.z.string().uuid(),
    serviceName: zod_1.z.string(),
    totalAppointments: zod_1.z.number(),
    completedAppointments: zod_1.z.number(),
    cancelledAppointments: zod_1.z.number(),
    noShowAppointments: zod_1.z.number(),
    revenue: zod_1.z.number(),
    averageRating: zod_1.z.number().optional(),
    popularTimeSlots: zod_1.z.array(zod_1.z.object({
        hour: zod_1.z.number(),
        count: zod_1.z.number(),
    })),
});
// Staff report data schema
exports.staffReportDataSchema = zod_1.z.object({
    staffId: zod_1.z.string().uuid(),
    staffName: zod_1.z.string(),
    totalAppointments: zod_1.z.number(),
    completedAppointments: zod_1.z.number(),
    cancelledAppointments: zod_1.z.number(),
    noShowAppointments: zod_1.z.number(),
    revenue: zod_1.z.number(),
    averageRating: zod_1.z.number().optional(),
    totalHours: zod_1.z.number(),
    utilizationRate: zod_1.z.number(),
    topServices: zod_1.z.array(zod_1.z.object({
        serviceId: zod_1.z.string().uuid(),
        serviceName: zod_1.z.string(),
        count: zod_1.z.number(),
    })),
});
// No-show report data schema
exports.noShowReportDataSchema = zod_1.z.object({
    period: zod_1.z.string(),
    totalAppointments: zod_1.z.number(),
    noShowCount: zod_1.z.number(),
    noShowRate: zod_1.z.number(),
    byService: zod_1.z.array(zod_1.z.object({
        serviceId: zod_1.z.string().uuid(),
        serviceName: zod_1.z.string(),
        noShowRate: zod_1.z.number(),
        count: zod_1.z.number(),
    })),
    byStaff: zod_1.z.array(zod_1.z.object({
        staffId: zod_1.z.string().uuid(),
        staffName: zod_1.z.string(),
        noShowRate: zod_1.z.number(),
        count: zod_1.z.number(),
    })),
    byTimeOfDay: zod_1.z.array(zod_1.z.object({
        hour: zod_1.z.number(),
        noShowRate: zod_1.z.number(),
        count: zod_1.z.number(),
    })),
    byDayOfWeek: zod_1.z.array(zod_1.z.object({
        dayOfWeek: zod_1.z.number(),
        dayName: zod_1.z.string(),
        noShowRate: zod_1.z.number(),
        count: zod_1.z.number(),
    })),
});
// Peak times report data schema
exports.peakTimesReportDataSchema = zod_1.z.object({
    hourlyData: zod_1.z.array(zod_1.z.object({
        hour: zod_1.z.number(),
        appointmentCount: zod_1.z.number(),
        revenue: zod_1.z.number(),
        utilization: zod_1.z.number(),
    })),
    dailyData: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string(),
        appointmentCount: zod_1.z.number(),
        revenue: zod_1.z.number(),
        peakHour: zod_1.z.number(),
    })),
    weeklyData: zod_1.z.array(zod_1.z.object({
        week: zod_1.z.string(),
        appointmentCount: zod_1.z.number(),
        revenue: zod_1.z.number(),
        peakDay: zod_1.z.number(),
    })),
    monthlyData: zod_1.z.array(zod_1.z.object({
        month: zod_1.z.string(),
        appointmentCount: zod_1.z.number(),
        revenue: zod_1.z.number(),
        peakWeek: zod_1.z.number(),
    })),
    recommendations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['STAFFING', 'MARKETING', 'PRICING', 'SCHEDULING']),
        priority: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        impact: zod_1.z.string(),
    })),
});
// Report response schema
exports.reportResponseSchema = zod_1.z.object({
    reportType: zod_1.z.nativeEnum(ReportType),
    generatedAt: zod_1.z.string().datetime(),
    data: zod_1.z.union([
        zod_1.z.array(exports.serviceReportDataSchema),
        zod_1.z.array(exports.staffReportDataSchema),
        exports.noShowReportDataSchema,
        exports.peakTimesReportDataSchema,
    ]),
    summary: zod_1.z.object({
        totalRecords: zod_1.z.number(),
        generatedIn: zod_1.z.number(), // milliseconds
        hasMore: zod_1.z.boolean(),
        filters: zod_1.z.record(zod_1.z.any()).optional(),
    }),
    metadata: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
        timePeriod: zod_1.z.nativeEnum(TimePeriod),
        includeArchived: zod_1.z.boolean(),
    }),
});
// Export request schema
exports.exportRequestSchema = zod_1.z.object({
    reportType: zod_1.z.nativeEnum(ReportType),
    format: zod_1.z.nativeEnum(ExportFormat),
    data: zod_1.z.any(), // The report data to export
    filename: zod_1.z.string().optional(),
    includeHeaders: zod_1.z.boolean().default(true),
    dateFormat: zod_1.z.string().default('YYYY-MM-DD'),
    currency: zod_1.z.string().default('USD'),
});
// Archival configuration schema
exports.archivalConfigSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    archiveAfterMonths: zod_1.z.number().min(1).max(60), // Archive after 1-60 months
    archiveStatuses: zod_1.z.array(zod_1.z.string()).default(['COMPLETED']),
    excludeRecentDays: zod_1.z.number().min(0).max(90).default(30), // Don't archive recent appointments
    batchSize: zod_1.z.number().min(10).max(1000).default(100), // Batch size for archival
    scheduleCron: zod_1.z.string().default('0 2 * * *'), // Daily at 2 AM
    enabled: zod_1.z.boolean().default(true),
});
// Archival job schema
exports.archivalJobSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    totalAppointments: zod_1.z.number(),
    archivedAppointments: zod_1.z.number(),
    failedAppointments: zod_1.z.number(),
    errorMessage: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime().optional(),
});
// Archive search schema
exports.archiveSearchSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    query: zod_1.z.string().max(200).optional(),
    customerId: zod_1.z.string().uuid().optional(),
    staffId: zod_1.z.string().uuid().optional(),
    serviceId: zod_1.z.string().uuid().optional(),
    referenceId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    status: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(1000).default(50),
    offset: zod_1.z.number().min(0).default(0),
    sortBy: zod_1.z.enum(['archivedAt', 'originalDate', 'customerName']).default('archivedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Archive result schema
exports.archiveResultSchema = zod_1.z.object({
    appointments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        originalId: zod_1.z.string().uuid(),
        customerId: zod_1.z.string().uuid(),
        customerName: zod_1.z.string(),
        customerEmail: zod_1.z.string(),
        staffId: zod_1.z.string().uuid(),
        staffName: zod_1.z.string(),
        serviceId: zod_1.z.string().uuid(),
        serviceName: zod_1.z.string(),
        startTimeUtc: zod_1.z.string().datetime(),
        endTimeUtc: zod_1.z.string().datetime(),
        status: zod_1.z.string(),
        referenceId: zod_1.z.string(),
        notes: zod_1.z.string().optional(),
        totalAmount: zod_1.z.number().optional(),
        archivedAt: zod_1.z.string().datetime(),
        archivedBy: zod_1.z.string().optional(),
    })),
    total: zod_1.z.number(),
    hasMore: zod_1.z.boolean(),
    summary: zod_1.z.object({
        totalArchived: zod_1.z.number(),
        dateRange: zod_1.z.object({
            earliest: zod_1.z.string().datetime(),
            latest: zod_1.z.string().datetime(),
        }),
        statusBreakdown: zod_1.z.record(zod_1.z.number()),
    }),
});
