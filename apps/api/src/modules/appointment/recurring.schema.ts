import { z } from 'zod';

// Recurrence patterns
export enum RecurrencePattern {
  WEEKLY = 'WEEKLY',
  BI_WEEKLY = 'BI_WEEKLY',
  MONTHLY = 'MONTHLY',
}

// Days of week for recurrence
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

// Monthly recurrence types
export enum MonthlyRecurrenceType {
  DAY_OF_MONTH = 'DAY_OF_MONTH', // e.g., 15th of every month
  DAY_OF_WEEK = 'DAY_OF_WEEK',   // e.g., 3rd Tuesday of every month
}

// Series status
export enum SeriesStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Recurrence rule schema
export const recurrenceRuleSchema = z.object({
  pattern: z.nativeEnum(RecurrencePattern),
  interval: z.number().min(1).max(52), // Number of weeks/months between occurrences
  daysOfWeek: z.array(z.nativeEnum(DayOfWeek)).min(1).max(7),
  monthlyType: z.nativeEnum(MonthlyRecurrenceType).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  weekOfMonth: z.number().min(1).max(5).optional(), // 1st, 2nd, 3rd, 4th, or last (5)
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().min(1).max(365).optional(),
  exceptions: z.array(z.string().datetime()).optional(), // Specific dates to skip
});

// Create recurring appointment series schema
export const createRecurringSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerId: z.string().uuid(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  recurrenceRule: recurrenceRuleSchema,
  createdBy: z.string().uuid(),
});

// Edit recurring series schema
export const editRecurringSeriesSchema = z.object({
  seriesId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  startTimeUtc: z.string().datetime().optional(),
  endTimeUtc: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  recurrenceRule: recurrenceRuleSchema.optional(),
  editMode: z.enum(['THIS_AND_FUTURE', 'ENTIRE_SERIES']),
  effectiveDate: z.string().datetime(), // Date from which changes apply
  updatedBy: z.string().uuid(),
});

// Cancel recurring appointment schema
export const cancelRecurringAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  cancelMode: z.enum(['SINGLE', 'THIS_AND_FUTURE', 'ENTIRE_SERIES']),
  reason: z.string().max(500).optional(),
  cancelledBy: z.string().uuid(),
});

// Recurrence generation request schema
export const generateRecurrenceSchema = z.object({
  recurrenceRule: recurrenceRuleSchema,
  baseStartTime: z.string().datetime(),
  baseEndTime: z.string().datetime(),
  maxOccurrences: z.number().min(1).max(365).optional(),
});

// Series response schema
export const recurringSeriesResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerId: z.string().uuid(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  notes: z.string().nullable(),
  recurrenceRule: recurrenceRuleSchema,
  status: z.nativeEnum(SeriesStatus),
  totalOccurrences: z.number(),
  completedOccurrences: z.number(),
  cancelledOccurrences: z.number(),
  nextOccurrence: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Occurrence response schema
export const occurrenceResponseSchema = z.object({
  id: z.string().uuid(),
  seriesId: z.string().uuid(),
  occurrenceDate: z.string().datetime(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  status: z.string(), // BOOKED, CANCELLED, COMPLETED, etc.
  isException: z.boolean(),
  referenceId: z.string(),
  createdAt: z.string().datetime(),
});

// Series metrics schema
export const seriesMetricsSchema = z.object({
  totalSeries: z.number(),
  activeSeries: z.number(),
  pausedSeries: z.number(),
  totalOccurrences: z.number(),
  completedOccurrences: z.number(),
  cancelledOccurrences: z.number(),
  upcomingOccurrences: z.number(),
  averageOccurrencesPerSeries: z.number(),
});

// Type exports
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type CreateRecurringSeriesData = z.infer<typeof createRecurringSeriesSchema>;
export type EditRecurringSeriesData = z.infer<typeof editRecurringSeriesSchema>;
export type CancelRecurringAppointmentData = z.infer<typeof cancelRecurringAppointmentSchema>;
export type GenerateRecurrenceData = z.infer<typeof generateRecurrenceSchema>;
export type RecurringSeriesResponse = z.infer<typeof recurringSeriesResponseSchema>;
export type OccurrenceResponse = z.infer<typeof occurrenceResponseSchema>;
export type SeriesMetrics = z.infer<typeof seriesMetricsSchema>;
