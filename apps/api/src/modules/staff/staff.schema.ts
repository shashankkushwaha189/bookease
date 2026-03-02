import { z } from 'zod';

const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

export const createStaffSchema = z.object({
    userId: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(255),
    email: z.string().email().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
    bio: z.string().max(1000).optional().nullable(),
    isActive: z.boolean().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export const breakSchema = z.object({
    id: z.string().uuid().optional(),
    startTime: timeString,
    endTime: timeString,
});

export const weeklyScheduleSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    isWorking: z.boolean().default(true),
    breaks: z.array(breakSchema).default([]),
});

export const updateScheduleSchema = z.object({
    schedules: z.array(weeklyScheduleSchema),
});

export const staffTimeOffSchema = z.object({
    date: z.string().datetime(),
    endDate: z.string().datetime().optional().nullable(),
    reason: z.string().max(255).optional().nullable(),
});

export const assignServicesSchema = z.object({
    serviceIds: z.array(z.string().uuid()),
});
