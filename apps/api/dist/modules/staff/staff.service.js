"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffService = exports.StaffService = void 0;
const staff_repository_1 = require("./staff.repository");
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("@bookease/logger");
const staff_schema_1 = require("./staff.schema");
class StaffService {
    repository = new staff_repository_1.StaffRepository();
    cache = new Map();
    metrics = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    async listStaff(tenantId, activeOnly = false, includeStats = false) {
        const startTime = Date.now();
        const cacheKey = `${tenantId}_${activeOnly}_${includeStats}`;
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.updateMetrics(tenantId, true, Date.now() - startTime);
            return cached.staff;
        }
        try {
            let staff = await this.repository.findAll(tenantId, activeOnly);
            // Add computed fields if requested
            if (includeStats) {
                staff = await Promise.all(staff.map(async (member) => ({
                    ...member,
                    weeklyWorkingHours: staff_schema_1.StaffUtils.getWeeklyWorkingHours(member),
                    appointmentCount: await this.repository.getAppointmentCount(member.id),
                    serviceCount: member.staffServices?.length || 0,
                    hasSchedule: member.weeklySchedule && member.weeklySchedule.length > 0,
                    upcomingTimeOff: await this.repository.getUpcomingTimeOff(member.id),
                })));
            }
            // Cache the result
            this.cache.set(cacheKey, {
                staff,
                expiresAt: Date.now() + this.CACHE_TTL_MS,
                lastFetched: Date.now(),
            });
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return staff;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error fetching staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getStaff(id, tenantId, includeStats = false) {
        const startTime = Date.now();
        try {
            const staff = await this.repository.findById(id, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            // Add computed fields if requested
            if (includeStats) {
                return {
                    ...staff,
                    weeklyWorkingHours: staff_schema_1.StaffUtils.getWeeklyWorkingHours(staff),
                    appointmentCount: await this.repository.getAppointmentCount(id),
                    serviceCount: staff.staffServices?.length || 0,
                    hasSchedule: staff.weeklySchedule && staff.weeklySchedule.length > 0,
                    upcomingTimeOff: await this.repository.getUpcomingTimeOff(id),
                };
            }
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return staff;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId: id }, 'Error fetching staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async createStaff(tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate input
            const validated = staff_schema_1.createStaffSchema.parse(data);
            // Check for duplicate email if provided
            if (validated.email) {
                const existing = await this.repository.findByEmail(tenantId, validated.email);
                if (existing) {
                    const error = new Error('Staff member with this email already exists');
                    error.code = 'DUPLICATE_EMAIL';
                    throw error;
                }
            }
            // Create staff member
            const staff = await this.repository.create({
                ...validated,
                tenantId,
            });
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffId: staff.id, name: validated.name }, 'Staff member created successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return staff;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error creating staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async updateStaff(id, tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate input
            const validated = staff_schema_1.updateStaffSchema.parse(data);
            // Check if staff member exists
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                throw new Error('Staff member not found');
            }
            // Check for duplicate email if email is being changed
            if (validated.email && validated.email !== existing.email) {
                const duplicate = await this.repository.findByEmail(tenantId, validated.email);
                if (duplicate && duplicate.id !== id) {
                    const error = new Error('Staff member with this email already exists');
                    error.code = 'DUPLICATE_EMAIL';
                    throw error;
                }
            }
            // Update staff member
            await this.repository.update(id, tenantId, validated);
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffId: id, changes: Object.keys(validated) }, 'Staff member updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return this.getStaff(id, tenantId);
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId: id }, 'Error updating staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async deleteStaff(id, tenantId) {
        const startTime = Date.now();
        try {
            // Check if staff member exists
            const staff = await this.repository.findById(id, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            // Check for existing appointments
            const appointmentCount = await this.repository.getAppointmentCount(id);
            if (appointmentCount > 0) {
                // Instead of deleting, deactivate the staff member
                await this.repository.update(id, tenantId, { isActive: false });
                logger_1.logger.info({ tenantId, staffId: id, appointmentCount }, 'Staff member deactivated due to existing appointments');
            }
            else {
                await this.repository.softDelete(id, tenantId);
                logger_1.logger.info({ tenantId, staffId: id }, 'Staff member deleted successfully');
            }
            // Clear cache
            this.clearCache(tenantId);
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, deactivated: appointmentCount > 0 };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId: id }, 'Error deleting staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getPublicStaff(tenantId) {
        return this.listStaff(tenantId, true); // true = activeOnly
    }
    async assignServices(staffId, tenantId, serviceIds) {
        const startTime = Date.now();
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            // Validate services belong to same tenant
            const services = await prisma_1.prisma.service.findMany({
                where: {
                    id: { in: serviceIds },
                    tenantId,
                    isActive: true,
                },
            });
            if (services.length !== serviceIds.length) {
                throw new Error('One or more services do not belong to this tenant or are inactive');
            }
            await this.repository.assignServices(staffId, serviceIds);
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffId, serviceIds }, 'Services assigned to staff successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return this.getStaff(staffId, tenantId);
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId, serviceIds }, 'Error assigning services to staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async setSchedule(staffId, tenantId, schedules) {
        const startTime = Date.now();
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            // Validate schedules
            const validation = staff_schema_1.StaffValidation.validateWeeklySchedule(schedules);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            await this.repository.updateSchedule(staffId, schedules);
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffId, scheduleCount: schedules.length }, 'Staff schedule updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return this.getStaff(staffId, tenantId);
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId }, 'Error updating staff schedule');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async addTimeOff(staffId, tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            // Validate time off data
            const validated = staff_schema_1.staffTimeOffSchema.parse(data);
            const validation = staff_schema_1.StaffValidation.validateTimeOff(validated);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            await this.repository.addTimeOff(staffId, validated);
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffId, timeOff: validated }, 'Time off added successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return this.getStaff(staffId, tenantId);
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId }, 'Error adding time off');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async addBulkTimeOff(tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate input
            const validated = staff_schema_1.bulkTimeOffSchema.parse(data);
            // Validate staff exist
            const staff = await this.repository.findByIds(validated.staffIds, tenantId);
            if (staff.length !== validated.staffIds.length) {
                throw new Error('One or more staff members not found');
            }
            // Validate time off data
            const validation = staff_schema_1.StaffValidation.validateTimeOff(validated.timeOff);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            // Add time off to all staff members
            const results = await Promise.all(validated.staffIds.map(staffId => this.repository.addTimeOff(staffId, validated.timeOff)));
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, staffIds: validated.staffIds, count: results.length }, 'Bulk time off added successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, count: results.length };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error adding bulk time off');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getStaffAvailability(staffId, tenantId, date) {
        const startTime = Date.now();
        try {
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            const isAvailable = staff_schema_1.StaffUtils.isStaffAvailable(staff, date);
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return {
                staffId,
                date,
                isAvailable,
                schedule: staff.weeklySchedule?.find((s) => s.dayOfWeek === date.getDay()),
                timeOffs: staff.timeOffs?.filter((timeOff) => {
                    const startDate = new Date(timeOff.date);
                    const endDate = timeOff.endDate ? new Date(timeOff.endDate) : startDate;
                    return date >= startDate && date <= endDate;
                }),
            };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId, date }, 'Error checking staff availability');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getAvailableTimeSlots(staffId, tenantId, date, serviceDuration) {
        const startTime = Date.now();
        try {
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }
            const slots = staff_schema_1.StaffUtils.getAvailableTimeSlots(staff, date, serviceDuration);
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return {
                staffId,
                date,
                serviceDuration,
                slots,
            };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, staffId, date }, 'Error getting available time slots');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async searchStaff(tenantId, query, activeOnly = true) {
        const staff = await this.listStaff(tenantId, activeOnly);
        return staff_schema_1.StaffUtils.searchStaff(staff, query);
    }
    // Performance and monitoring methods
    updateMetrics(tenantId, isHit, responseTime) {
        const existing = this.metrics.get(tenantId) || {
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            totalRequests: 0,
        };
        if (isHit) {
            existing.cacheHits++;
        }
        else {
            existing.cacheMisses++;
        }
        existing.totalRequests++;
        existing.averageResponseTime =
            (existing.averageResponseTime * (existing.totalRequests - 1) + responseTime) / existing.totalRequests;
        this.metrics.set(tenantId, existing);
    }
    getMetrics(tenantId) {
        return this.metrics.get(tenantId);
    }
    getCacheHitRate(tenantId) {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.totalRequests === 0)
            return 0;
        return metrics.cacheHits / metrics.totalRequests;
    }
    clearCache(tenantId) {
        if (tenantId) {
            // Clear specific tenant's cache
            for (const key of this.cache.keys()) {
                if (key.startsWith(tenantId + '_')) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.cache.clear();
        }
    }
    async healthCheck() {
        const summary = {};
        for (const [tenantId, metrics] of this.metrics.entries()) {
            summary[tenantId] = {
                cacheHitRate: this.getCacheHitRate(tenantId),
                averageResponseTime: metrics.averageResponseTime,
                totalRequests: metrics.totalRequests,
            };
        }
        return {
            status: 'healthy',
            cacheSize: this.cache.size,
            metrics: summary,
        };
    }
}
exports.StaffService = StaffService;
exports.staffService = new StaffService();
