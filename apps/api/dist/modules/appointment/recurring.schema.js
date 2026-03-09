"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seriesMetricsSchema = exports.occurrenceResponseSchema = exports.recurringSeriesResponseSchema = exports.generateRecurrenceSchema = exports.cancelRecurringAppointmentSchema = exports.editRecurringSeriesSchema = exports.createRecurringSeriesSchema = exports.recurrenceRuleSchema = exports.SeriesStatus = exports.MonthlyRecurrenceType = exports.DayOfWeek = exports.RecurrencePattern = void 0;
const zod_1 = require("zod");
// Recurrence patterns
var RecurrencePattern;
(function (RecurrencePattern) {
    RecurrencePattern["WEEKLY"] = "WEEKLY";
    RecurrencePattern["BI_WEEKLY"] = "BI_WEEKLY";
    RecurrencePattern["MONTHLY"] = "MONTHLY";
})(RecurrencePattern || (exports.RecurrencePattern = RecurrencePattern = {}));
// Days of week for recurrence
var DayOfWeek;
(function (DayOfWeek) {
    DayOfWeek[DayOfWeek["SUNDAY"] = 0] = "SUNDAY";
    DayOfWeek[DayOfWeek["MONDAY"] = 1] = "MONDAY";
    DayOfWeek[DayOfWeek["TUESDAY"] = 2] = "TUESDAY";
    DayOfWeek[DayOfWeek["WEDNESDAY"] = 3] = "WEDNESDAY";
    DayOfWeek[DayOfWeek["THURSDAY"] = 4] = "THURSDAY";
    DayOfWeek[DayOfWeek["FRIDAY"] = 5] = "FRIDAY";
    DayOfWeek[DayOfWeek["SATURDAY"] = 6] = "SATURDAY";
})(DayOfWeek || (exports.DayOfWeek = DayOfWeek = {}));
// Monthly recurrence types
var MonthlyRecurrenceType;
(function (MonthlyRecurrenceType) {
    MonthlyRecurrenceType["DAY_OF_MONTH"] = "DAY_OF_MONTH";
    MonthlyRecurrenceType["DAY_OF_WEEK"] = "DAY_OF_WEEK";
})(MonthlyRecurrenceType || (exports.MonthlyRecurrenceType = MonthlyRecurrenceType = {}));
// Series status
var SeriesStatus;
(function (SeriesStatus) {
    SeriesStatus["ACTIVE"] = "ACTIVE";
    SeriesStatus["PAUSED"] = "PAUSED";
    SeriesStatus["CANCELLED"] = "CANCELLED";
    SeriesStatus["COMPLETED"] = "COMPLETED";
})(SeriesStatus || (exports.SeriesStatus = SeriesStatus = {}));
// Recurrence rule schema
exports.recurrenceRuleSchema = zod_1.z.object({
    pattern: zod_1.z.nativeEnum(RecurrencePattern),
    interval: zod_1.z.number().min(1).max(52), // Number of weeks/months between occurrences
    daysOfWeek: zod_1.z.array(zod_1.z.nativeEnum(DayOfWeek)).min(1).max(7),
    monthlyType: zod_1.z.nativeEnum(MonthlyRecurrenceType).optional(),
    dayOfMonth: zod_1.z.number().min(1).max(31).optional(),
    weekOfMonth: zod_1.z.number().min(1).max(5).optional(), // 1st, 2nd, 3rd, 4th, or last (5)
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    maxOccurrences: zod_1.z.number().min(1).max(365).optional(),
    exceptions: zod_1.z.array(zod_1.z.string().datetime()).optional(), // Specific dates to skip
});
// Create recurring appointment series schema
exports.createRecurringSeriesSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    staffId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid(),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    notes: zod_1.z.string().max(1000).optional(),
    recurrenceRule: exports.recurrenceRuleSchema,
    createdBy: zod_1.z.string().uuid(),
});
// Edit recurring series schema
exports.editRecurringSeriesSchema = zod_1.z.object({
    seriesId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200).optional(),
    startTimeUtc: zod_1.z.string().datetime().optional(),
    endTimeUtc: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().max(1000).optional(),
    recurrenceRule: exports.recurrenceRuleSchema.optional(),
    editMode: zod_1.z.enum(['THIS_AND_FUTURE', 'ENTIRE_SERIES']),
    effectiveDate: zod_1.z.string().datetime(), // Date from which changes apply
    updatedBy: zod_1.z.string().uuid(),
});
// Cancel recurring appointment schema
exports.cancelRecurringAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().uuid(),
    cancelMode: zod_1.z.enum(['SINGLE', 'THIS_AND_FUTURE', 'ENTIRE_SERIES']),
    reason: zod_1.z.string().max(500).optional(),
    cancelledBy: zod_1.z.string().uuid(),
});
// Recurrence generation request schema
exports.generateRecurrenceSchema = zod_1.z.object({
    recurrenceRule: exports.recurrenceRuleSchema,
    baseStartTime: zod_1.z.string().datetime(),
    baseEndTime: zod_1.z.string().datetime(),
    maxOccurrences: zod_1.z.number().min(1).max(365).optional(),
});
// Series response schema
exports.recurringSeriesResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    staffId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid(),
    customerId: zod_1.z.string().uuid(),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    notes: zod_1.z.string().nullable(),
    recurrenceRule: exports.recurrenceRuleSchema,
    status: zod_1.z.nativeEnum(SeriesStatus),
    totalOccurrences: zod_1.z.number(),
    completedOccurrences: zod_1.z.number(),
    cancelledOccurrences: zod_1.z.number(),
    nextOccurrence: zod_1.z.string().datetime().nullable(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Occurrence response schema
exports.occurrenceResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    seriesId: zod_1.z.string().uuid(),
    occurrenceDate: zod_1.z.string().datetime(),
    startTimeUtc: zod_1.z.string().datetime(),
    endTimeUtc: zod_1.z.string().datetime(),
    status: zod_1.z.string(), // BOOKED, CANCELLED, COMPLETED, etc.
    isException: zod_1.z.boolean(),
    referenceId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Series metrics schema
exports.seriesMetricsSchema = zod_1.z.object({
    totalSeries: zod_1.z.number(),
    activeSeries: zod_1.z.number(),
    pausedSeries: zod_1.z.number(),
    totalOccurrences: zod_1.z.number(),
    completedOccurrences: zod_1.z.number(),
    cancelledOccurrences: zod_1.z.number(),
    upcomingOccurrences: zod_1.z.number(),
    averageOccurrencesPerSeries: zod_1.z.number(),
});
