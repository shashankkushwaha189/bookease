"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignServicesSchema = exports.staffTimeOffSchema = exports.updateScheduleSchema = exports.weeklyScheduleSchema = exports.breakSchema = exports.updateStaffSchema = exports.createStaffSchema = void 0;
const zod_1 = require("zod");
const timeString = zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');
exports.createStaffSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional().nullable(),
    name: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email().optional().nullable(),
    photoUrl: zod_1.z.string().url().optional().nullable(),
    bio: zod_1.z.string().max(1000).optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateStaffSchema = exports.createStaffSchema.partial();
exports.breakSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    startTime: timeString,
    endTime: timeString,
});
exports.weeklyScheduleSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    isWorking: zod_1.z.boolean().default(true),
    breaks: zod_1.z.array(exports.breakSchema).default([]),
});
exports.updateScheduleSchema = zod_1.z.object({
    schedules: zod_1.z.array(exports.weeklyScheduleSchema),
});
exports.staffTimeOffSchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional().nullable(),
    reason: zod_1.z.string().max(255).optional().nullable(),
});
exports.assignServicesSchema = zod_1.z.object({
    serviceIds: zod_1.z.array(zod_1.z.string().uuid()),
});
