"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUtils = exports.ServiceValidation = exports.updateServiceSchema = exports.createServiceSchema = void 0;
const zod_1 = require("zod");
const timeString = zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)');
// Enhanced service schema with comprehensive validation
exports.createServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
    category: zod_1.z.string().min(1).max(100).default('General'),
    durationMinutes: zod_1.z.number().int().min(5).max(480), // 5 min to 8 hours
    bufferBefore: zod_1.z.number().int().min(0).max(120).default(0), // 0-2 hours
    bufferAfter: zod_1.z.number().int().min(0).max(120).default(0), // 0-2 hours
    price: zod_1.z.number().nonnegative().optional(),
    isActive: zod_1.z.boolean().default(true),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (hex)').optional(),
    requiresDeposit: zod_1.z.boolean().default(false),
    depositAmount: zod_1.z.number().nonnegative().optional(),
    maxAdvanceBookingDays: zod_1.z.number().int().min(1).max(365).optional(),
    minAdvanceBookingHours: zod_1.z.number().int().min(0).max(168).optional(),
    allowOnlineBooking: zod_1.z.boolean().default(true),
    requiresConfirmation: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string().max(50)).max(10).default([]),
});
exports.updateServiceSchema = exports.createServiceSchema.partial();
// Service validation utilities
class ServiceValidation {
    static validateDuration(durationMinutes) {
        return durationMinutes >= 5 && durationMinutes <= 480;
    }
    static validateBuffer(bufferMinutes) {
        return bufferMinutes >= 0 && bufferMinutes <= 120;
    }
    static validateTotalDuration(durationMinutes, bufferBefore, bufferAfter) {
        const total = durationMinutes + bufferBefore + bufferAfter;
        return total <= 600; // Max 10 hours total
    }
    static validatePrice(price) {
        return price === undefined || price >= 0;
    }
    static validateAdvanceBooking(minHours, maxDays) {
        if (minHours !== undefined && (minHours < 0 || minHours > 168))
            return false;
        if (maxDays !== undefined && (maxDays < 1 || maxDays > 365))
            return false;
        if (minHours !== undefined && maxDays !== undefined) {
            const maxHours = maxDays * 24;
            return minHours < maxHours;
        }
        return true;
    }
}
exports.ServiceValidation = ServiceValidation;
// Service utility functions
class ServiceUtils {
    static calculateTotalDuration(service) {
        return service.durationMinutes + service.bufferBefore + service.bufferAfter;
    }
    static calculateEndTime(startTime, service) {
        const totalDuration = this.calculateTotalDuration(service);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + totalDuration);
        return endTime;
    }
    static isServiceAvailable(service, requireOnlineBooking = true) {
        if (!service.isActive)
            return false;
        if (requireOnlineBooking && !service.allowOnlineBooking)
            return false;
        return true;
    }
    static filterActiveServices(services) {
        return services.filter(service => service.isActive);
    }
    static searchServices(services, query) {
        if (!query.trim())
            return services;
        const lowercaseQuery = query.toLowerCase();
        return services.filter(service => service.name.toLowerCase().includes(lowercaseQuery) ||
            service.description?.toLowerCase().includes(lowercaseQuery) ||
            service.category.toLowerCase().includes(lowercaseQuery) ||
            service.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery)));
    }
    static groupServicesByCategory(services) {
        return services.reduce((groups, service) => {
            const category = service.category || 'General';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(service);
            return groups;
        }, {});
    }
    static validateServiceName(name) {
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
    static validateServiceDescription(description) {
        if (!description)
            return { isValid: true };
        if (description.length > 1000) {
            return { isValid: false, error: 'Description must be 1000 characters or less' };
        }
        return { isValid: true };
    }
}
exports.ServiceUtils = ServiceUtils;
