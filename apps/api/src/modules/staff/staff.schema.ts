import { z } from 'zod';

const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');
const dateString = z.string().datetime();

// Enhanced staff schema with comprehensive validation
export const createStaffSchema = z.object({
    userId: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(255),
    email: z.string().email().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
    bio: z.string().max(1000).optional().nullable(),
    phone: z.string().optional().nullable(),
    title: z.string().max(100).optional().nullable(),
    department: z.string().max(100).optional().nullable(),
    hireDate: z.string().datetime().optional().nullable(),
    isActive: z.boolean().default(true),
    maxConcurrentAppointments: z.number().int().min(1).max(10).default(1),
    requiresApproval: z.boolean().default(false),
    commissionRate: z.number().min(0).max(100).optional(),
});

export const updateStaffSchema = createStaffSchema.partial();

// Enhanced schedule validation
export const breakSchema = z.object({
    id: z.string().uuid().optional(),
    startTime: timeString,
    endTime: timeString,
    title: z.string().max(100).optional(),
});

export const weeklyScheduleSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    isWorking: z.boolean().default(true),
    breaks: z.array(breakSchema).default([]),
    maxAppointments: z.number().int().min(1).max(50).optional(),
});

export const updateScheduleSchema = z.object({
    schedules: z.array(weeklyScheduleSchema),
});

export const staffTimeOffSchema = z.object({
    date: dateString,
    endDate: dateString.optional().nullable(),
    reason: z.string().max(255).optional().nullable(),
    type: z.enum(['VACATION', 'SICK', 'PERSONAL', 'HOLIDAY', 'TRAINING']).default('PERSONAL'),
    isPaid: z.boolean().default(true),
});

export const assignServicesSchema = z.object({
    serviceIds: z.array(z.string().uuid()),
});

export const bulkTimeOffSchema = z.object({
    staffIds: z.array(z.string().uuid()),
    timeOff: staffTimeOffSchema,
});

// Staff validation utilities
export class StaffValidation {
    static validateTimeRange(startTime: string, endTime: string): { isValid: boolean; error?: string } {
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        if (start >= end) {
            return { isValid: false, error: 'End time must be after start time' };
        }
        
        return { isValid: true };
    }

    static validateBreaks(breaks: any[], workStart: string, workEnd: string): { isValid: boolean; error?: string } {
        if (!breaks || breaks.length === 0) return { isValid: true };
        
        const workStartMinutes = this.timeToMinutes(workStart);
        const workEndMinutes = this.timeToMinutes(workEnd);
        
        for (const breakItem of breaks) {
            const breakStart = this.timeToMinutes(breakItem.startTime);
            const breakEnd = this.timeToMinutes(breakItem.endTime);
            
            // Check if break is within work hours
            if (breakStart < workStartMinutes || breakEnd > workEndMinutes) {
                return { isValid: false, error: `Break ${breakItem.startTime}-${breakItem.endTime} must be within working hours` };
            }
            
            // Check if break has valid duration
            if (breakStart >= breakEnd) {
                return { isValid: false, error: `Break end time must be after start time` };
            }
        }
        
        // Check for overlapping breaks
        const sortedBreaks = [...breaks].sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < sortedBreaks.length - 1; i++) {
            const currentEnd = this.timeToMinutes(sortedBreaks[i].endTime);
            const nextStart = this.timeToMinutes(sortedBreaks[i + 1].startTime);
            
            if (currentEnd > nextStart) {
                return { isValid: false, error: 'Breaks cannot overlap' };
            }
        }
        
        return { isValid: true };
    }

    static validateWeeklySchedule(schedules: any[]): { isValid: boolean; error?: string } {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Check for duplicate days
        const days = schedules.map(s => s.dayOfWeek);
        const uniqueDays = [...new Set(days)];
        if (days.length !== uniqueDays.length) {
            return { isValid: false, error: 'Duplicate day entries found' };
        }
        
        // Validate each day's schedule
        for (const schedule of schedules) {
            if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
                return { isValid: false, error: `Invalid day of week: ${schedule.dayOfWeek}` };
            }
            
            if (schedule.isWorking) {
                const timeValidation = this.validateTimeRange(schedule.startTime, schedule.endTime);
                if (!timeValidation.isValid) {
                    return { isValid: false, error: `${dayNames[schedule.dayOfWeek]}: ${timeValidation.error}` };
                }
                
                const breakValidation = this.validateBreaks(schedule.breaks, schedule.startTime, schedule.endTime);
                if (!breakValidation.isValid) {
                    return { isValid: false, error: `${dayNames[schedule.dayOfWeek]}: ${breakValidation.error}` };
                }
            }
        }
        
        return { isValid: true };
    }

    static validateTimeOff(timeOff: any): { isValid: boolean; error?: string } {
        const startDate = new Date(timeOff.date);
        
        if (isNaN(startDate.getTime())) {
            return { isValid: false, error: 'Invalid start date' };
        }
        
        if (timeOff.endDate) {
            const endDate = new Date(timeOff.endDate);
            
            if (isNaN(endDate.getTime())) {
                return { isValid: false, error: 'Invalid end date' };
            }
            
            if (endDate <= startDate) {
                return { isValid: false, error: 'End date must be after start date' };
            }
            
            // Check if time off period is too long (max 1 year)
            const maxEnd = new Date(startDate);
            maxEnd.setFullYear(maxEnd.getFullYear() + 1);
            if (endDate > maxEnd) {
                return { isValid: false, error: 'Time off period cannot exceed 1 year' };
            }
        }
        
        return { isValid: true };
    }

    private static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

// Staff utility functions
export class StaffUtils {
    static isStaffAvailable(staff: any, date: Date): boolean {
        if (!staff.isActive) return false;
        
        // Check time off
        if (staff.timeOffs) {
            for (const timeOff of staff.timeOffs) {
                const startDate = new Date(timeOff.date);
                const endDate = timeOff.endDate ? new Date(timeOff.endDate) : startDate;
                
                if (date >= startDate && date <= endDate) {
                    return false;
                }
            }
        }
        
        // Check weekly schedule
        const dayOfWeek = date.getDay();
        const schedule = staff.weeklySchedule?.find((s: any) => s.dayOfWeek === dayOfWeek);
        
        if (!schedule || !schedule.isWorking) {
            return false;
        }
        
        const currentTime = date.getHours() * 60 + date.getMinutes();
        const startTime = this.timeToMinutes(schedule.startTime);
        const endTime = this.timeToMinutes(schedule.endTime);
        
        if (currentTime < startTime || currentTime > endTime) {
            return false;
        }
        
        // Check breaks
        if (schedule.breaks) {
            for (const breakItem of schedule.breaks) {
                const breakStart = this.timeToMinutes(breakItem.startTime);
                const breakEnd = this.timeToMinutes(breakItem.endTime);
                
                if (currentTime >= breakStart && currentTime < breakEnd) {
                    return false;
                }
            }
        }
        
        return true;
    }

    static getAvailableTimeSlots(staff: any, date: Date, serviceDuration: number): { start: string; end: string }[] {
        if (!this.isStaffAvailable(staff, date)) {
            return [];
        }
        
        const dayOfWeek = date.getDay();
        const schedule = staff.weeklySchedule?.find((s: any) => s.dayOfWeek === dayOfWeek);
        
        if (!schedule || !schedule.isWorking) {
            return [];
        }
        
        const startTime = this.timeToMinutes(schedule.startTime);
        const endTime = this.timeToMinutes(schedule.endTime);
        const slots: { start: string; end: string }[] = [];
        
        let currentTime = startTime;
        
        // Sort breaks by start time
        const sortedBreaks = [...(schedule.breaks || [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        for (const breakItem of sortedBreaks) {
            const breakStart = this.timeToMinutes(breakItem.startTime);
            
            // Add slots before break
            while (currentTime + serviceDuration <= breakStart) {
                slots.push({
                    start: this.minutesToTime(currentTime),
                    end: this.minutesToTime(currentTime + serviceDuration),
                });
                currentTime += 30; // 30-minute intervals
            }
            
            // Jump to after break
            currentTime = Math.max(currentTime, this.timeToMinutes(breakItem.endTime));
        }
        
        // Add remaining slots
        while (currentTime + serviceDuration <= endTime) {
            slots.push({
                start: this.minutesToTime(currentTime),
                end: this.minutesToTime(currentTime + serviceDuration),
            });
            currentTime += 30; // 30-minute intervals
        }
        
        return slots;
    }

    static calculateWorkingHours(schedule: any): number {
        if (!schedule.isWorking) return 0;
        
        const startTime = this.timeToMinutes(schedule.startTime);
        const endTime = this.timeToMinutes(schedule.endTime);
        let totalMinutes = endTime - startTime;
        
        // Subtract break time
        if (schedule.breaks) {
            for (const breakItem of schedule.breaks) {
                const breakStart = this.timeToMinutes(breakItem.startTime);
                const breakEnd = this.timeToMinutes(breakItem.endTime);
                totalMinutes -= (breakEnd - breakStart);
            }
        }
        
        return totalMinutes / 60; // Convert to hours
    }

    static getWeeklyWorkingHours(staff: any): number {
        if (!staff.weeklySchedule) return 0;
        
        return staff.weeklySchedule.reduce((total: number, schedule: any) => {
            return total + this.calculateWorkingHours(schedule);
        }, 0);
    }

    static searchStaff(staff: any[], query: string): any[] {
        if (!query.trim()) return staff;
        
        const lowercaseQuery = query.toLowerCase();
        return staff.filter(member => 
            member.name.toLowerCase().includes(lowercaseQuery) ||
            member.email?.toLowerCase().includes(lowercaseQuery) ||
            member.title?.toLowerCase().includes(lowercaseQuery) ||
            member.department?.toLowerCase().includes(lowercaseQuery)
        );
    }

    private static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private static minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
