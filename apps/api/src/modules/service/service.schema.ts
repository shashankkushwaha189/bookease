import { z } from 'zod';

const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');

// Enhanced service schema with comprehensive validation
export const createServiceSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    category: z.string().min(1).max(100).default('General'),
    durationMinutes: z.number().int().min(5).max(480), // 5 min to 8 hours
    bufferBefore: z.number().int().min(0).max(120).default(0), // 0-2 hours
    bufferAfter: z.number().int().min(0).max(120).default(0), // 0-2 hours
    price: z.number().nonnegative().optional(),
    isActive: z.boolean().default(true),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (hex)').optional(),
    requiresDeposit: z.boolean().default(false),
    depositAmount: z.number().nonnegative().optional(),
    maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
    minAdvanceBookingHours: z.number().int().min(0).max(168).optional(),
    allowOnlineBooking: z.boolean().default(true),
    requiresConfirmation: z.boolean().default(false),
    tags: z.array(z.string().max(50)).max(10).default([]),
});

export const updateServiceSchema = createServiceSchema.partial();

// Service validation utilities
export class ServiceValidation {
    static validateDuration(durationMinutes: number): boolean {
        return durationMinutes >= 5 && durationMinutes <= 480;
    }

    static validateBuffer(bufferMinutes: number): boolean {
        return bufferMinutes >= 0 && bufferMinutes <= 120;
    }

    static validateTotalDuration(durationMinutes: number, bufferBefore: number, bufferAfter: number): boolean {
        const total = durationMinutes + bufferBefore + bufferAfter;
        return total <= 600; // Max 10 hours total
    }

    static validatePrice(price?: number): boolean {
        return price === undefined || price >= 0;
    }

    static validateAdvanceBooking(minHours?: number, maxDays?: number): boolean {
        if (minHours !== undefined && (minHours < 0 || minHours > 168)) return false;
        if (maxDays !== undefined && (maxDays < 1 || maxDays > 365)) return false;
        if (minHours !== undefined && maxDays !== undefined) {
            const maxHours = maxDays * 24;
            return minHours < maxHours;
        }
        return true;
    }
}

// Service utility functions
export class ServiceUtils {
    static calculateTotalDuration(service: {
        durationMinutes: number;
        bufferBefore: number;
        bufferAfter: number;
    }): number {
        return service.durationMinutes + service.bufferBefore + service.bufferAfter;
    }

    static calculateEndTime(startTime: Date, service: {
        durationMinutes: number;
        bufferBefore: number;
        bufferAfter: number;
    }): Date {
        const totalDuration = this.calculateTotalDuration(service);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + totalDuration);
        return endTime;
    }

    static isServiceAvailable(service: {
        isActive: boolean;
        allowOnlineBooking: boolean;
    }, requireOnlineBooking: boolean = true): boolean {
        if (!service.isActive) return false;
        if (requireOnlineBooking && !service.allowOnlineBooking) return false;
        return true;
    }

    static filterActiveServices(services: any[]): any[] {
        return services.filter(service => service.isActive);
    }

    static searchServices(services: any[], query: string): any[] {
        if (!query.trim()) return services;
        
        const lowercaseQuery = query.toLowerCase();
        return services.filter(service => 
            service.name.toLowerCase().includes(lowercaseQuery) ||
            service.description?.toLowerCase().includes(lowercaseQuery) ||
            service.category.toLowerCase().includes(lowercaseQuery) ||
            service.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseQuery))
        );
    }

    static groupServicesByCategory(services: any[]): Record<string, any[]> {
        return services.reduce((groups, service) => {
            const category = service.category || 'General';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(service);
            return groups;
        }, {} as Record<string, any[]>);
    }

    static validateServiceName(name: string): { isValid: boolean; error?: string } {
        if (!name || name.trim().length === 0) {
            return { isValid: false, error: 'Service name is required' };
        }
        if (name.length > 255) {
            return { isValid: false, error: 'Service name must be 255 characters or less' };
        }
        if (!/^.{1,255}$/.test(name.trim())) {
            return { isValid: false, error: 'Service name contains invalid characters' };
        }
        return { isValid: true };
    }

    static validateServiceDescription(description?: string): { isValid: boolean; error?: string } {
        if (!description) return { isValid: true };
        if (description.length > 1000) {
            return { isValid: false, error: 'Description must be 1000 characters or less' };
        }
        return { isValid: true };
    }
}
