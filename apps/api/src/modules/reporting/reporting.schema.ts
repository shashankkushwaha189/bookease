import { z } from 'zod';

// Report types
export enum ReportType {
  APPOINTMENTS_BY_SERVICE = 'APPOINTMENTS_BY_SERVICE',
  APPOINTMENTS_BY_STAFF = 'APPOINTMENTS_BY_STAFF',
  NO_SHOW_RATE = 'NO_SHOW_RATE',
  PEAK_BOOKING_TIMES = 'PEAK_BOOKING_TIMES',
  REVENUE_SUMMARY = 'REVENUE_SUMMARY',
  CUSTOMER_ANALYTICS = 'CUSTOMER_ANALYTICS',
  STAFF_PERFORMANCE = 'STAFF_PERFORMANCE',
}

// Export formats
export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  PDF = 'PDF',
  EXCEL = 'EXCEL',
}

// Time period types
export enum TimePeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

// Report query schema
export const reportQuerySchema = z.object({
  tenantId: z.string().uuid(),
  reportType: z.nativeEnum(ReportType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timePeriod: z.nativeEnum(TimePeriod),
  filters: z.object({
    serviceIds: z.array(z.string().uuid()).optional(),
    staffIds: z.array(z.string().uuid()).optional(),
    customerIds: z.array(z.string().uuid()).optional(),
    statuses: z.array(z.string()).optional(),
    appointmentTypes: z.array(z.string()).optional(),
  }).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().min(1).max(10000).default(1000),
  offset: z.number().min(0).default(0),
});

// Service report data schema
export const serviceReportDataSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  totalAppointments: z.number(),
  completedAppointments: z.number(),
  cancelledAppointments: z.number(),
  noShowAppointments: z.number(),
  revenue: z.number(),
  averageRating: z.number().optional(),
  popularTimeSlots: z.array(z.object({
    hour: z.number(),
    count: z.number(),
  })),
});

// Staff report data schema
export const staffReportDataSchema = z.object({
  staffId: z.string().uuid(),
  staffName: z.string(),
  totalAppointments: z.number(),
  completedAppointments: z.number(),
  cancelledAppointments: z.number(),
  noShowAppointments: z.number(),
  revenue: z.number(),
  averageRating: z.number().optional(),
  totalHours: z.number(),
  utilizationRate: z.number(),
  topServices: z.array(z.object({
    serviceId: z.string().uuid(),
    serviceName: z.string(),
    count: z.number(),
  })),
});

// No-show report data schema
export const noShowReportDataSchema = z.object({
  period: z.string(),
  totalAppointments: z.number(),
  noShowCount: z.number(),
  noShowRate: z.number(),
  byService: z.array(z.object({
    serviceId: z.string().uuid(),
    serviceName: z.string(),
    noShowRate: z.number(),
    count: z.number(),
  })),
  byStaff: z.array(z.object({
    staffId: z.string().uuid(),
    staffName: z.string(),
    noShowRate: z.number(),
    count: z.number(),
  })),
  byTimeOfDay: z.array(z.object({
    hour: z.number(),
    noShowRate: z.number(),
    count: z.number(),
  })),
  byDayOfWeek: z.array(z.object({
    dayOfWeek: z.number(),
    dayName: z.string(),
    noShowRate: z.number(),
    count: z.number(),
  })),
});

// Peak times report data schema
export const peakTimesReportDataSchema = z.object({
  hourlyData: z.array(z.object({
    hour: z.number(),
    appointmentCount: z.number(),
    revenue: z.number(),
    utilization: z.number(),
  })),
  dailyData: z.array(z.object({
    date: z.string(),
    appointmentCount: z.number(),
    revenue: z.number(),
    peakHour: z.number(),
  })),
  weeklyData: z.array(z.object({
    week: z.string(),
    appointmentCount: z.number(),
    revenue: z.number(),
    peakDay: z.number(),
  })),
  monthlyData: z.array(z.object({
    month: z.string(),
    appointmentCount: z.number(),
    revenue: z.number(),
    peakWeek: z.number(),
  })),
  recommendations: z.array(z.object({
    type: z.enum(['STAFFING', 'MARKETING', 'PRICING', 'SCHEDULING']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    title: z.string(),
    description: z.string(),
    impact: z.string(),
  })),
});

// Report response schema
export const reportResponseSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  generatedAt: z.string().datetime(),
  data: z.union([
    z.array(serviceReportDataSchema),
    z.array(staffReportDataSchema),
    noShowReportDataSchema,
    peakTimesReportDataSchema,
  ]),
  summary: z.object({
    totalRecords: z.number(),
    generatedIn: z.number(), // milliseconds
    hasMore: z.boolean(),
    filters: z.record(z.any()).optional(),
  }),
  metadata: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timePeriod: z.nativeEnum(TimePeriod),
    includeArchived: z.boolean(),
  }),
});

// Export request schema
export const exportRequestSchema = z.object({
  reportType: z.nativeEnum(ReportType),
  format: z.nativeEnum(ExportFormat),
  data: z.any(), // The report data to export
  filename: z.string().optional(),
  includeHeaders: z.boolean().default(true),
  dateFormat: z.string().default('YYYY-MM-DD'),
  currency: z.string().default('USD'),
});

// Archival configuration schema
export const archivalConfigSchema = z.object({
  tenantId: z.string().uuid(),
  archiveAfterMonths: z.number().min(1).max(60), // Archive after 1-60 months
  archiveStatuses: z.array(z.string()).default(['COMPLETED']),
  excludeRecentDays: z.number().min(0).max(90).default(30), // Don't archive recent appointments
  batchSize: z.number().min(10).max(1000).default(100), // Batch size for archival
  scheduleCron: z.string().default('0 2 * * *'), // Daily at 2 AM
  enabled: z.boolean().default(true),
});

// Archival job schema
export const archivalJobSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  totalAppointments: z.number(),
  archivedAppointments: z.number(),
  failedAppointments: z.number(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime().optional(),
});

// Archive search schema
export const archiveSearchSchema = z.object({
  tenantId: z.string().uuid(),
  query: z.string().max(200).optional(),
  customerId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  referenceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.string().optional(),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['archivedAt', 'originalDate', 'customerName']).default('archivedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Archive result schema
export const archiveResultSchema = z.object({
  appointments: z.array(z.object({
    id: z.string().uuid(),
    originalId: z.string().uuid(),
    customerId: z.string().uuid(),
    customerName: z.string(),
    customerEmail: z.string(),
    staffId: z.string().uuid(),
    staffName: z.string(),
    serviceId: z.string().uuid(),
    serviceName: z.string(),
    startTimeUtc: z.string().datetime(),
    endTimeUtc: z.string().datetime(),
    status: z.string(),
    referenceId: z.string(),
    notes: z.string().optional(),
    totalAmount: z.number().optional(),
    archivedAt: z.string().datetime(),
    archivedBy: z.string().optional(),
  })),
  total: z.number(),
  hasMore: z.boolean(),
  summary: z.object({
    totalArchived: z.number(),
    dateRange: z.object({
      earliest: z.string().datetime(),
      latest: z.string().datetime(),
    }),
    statusBreakdown: z.record(z.number()),
  }),
});

// Type exports
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportResponse = z.infer<typeof reportResponseSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type ServiceReportData = z.infer<typeof serviceReportDataSchema>;
export type StaffReportData = z.infer<typeof staffReportDataSchema>;
export type NoShowReportData = z.infer<typeof noShowReportDataSchema>;
export type PeakTimesReportData = z.infer<typeof peakTimesReportDataSchema>;
export type ArchivalConfig = z.infer<typeof archivalConfigSchema>;
export type ArchivalJob = z.infer<typeof archivalJobSchema>;
export type ArchiveSearch = z.infer<typeof archiveSearchSchema>;
export type ArchiveResult = z.infer<typeof archiveResultSchema>;
