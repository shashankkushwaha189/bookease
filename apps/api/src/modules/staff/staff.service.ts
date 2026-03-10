import { StaffRepository } from './staff.repository';
import { prisma } from '../../lib/prisma';
import { createStaffSchema, updateStaffSchema, weeklyScheduleSchema, staffTimeOffSchema, assignServicesSchema, bulkTimeOffSchema, StaffValidation, StaffUtils } from './staff.schema';
import { configService } from '../config/config.service';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

interface StaffMetrics {
    cacheHits: number;
    cacheMisses: number;
    averageResponseTime: number;
    totalRequests: number;
}

interface CachedStaff {
    staff: any[];
    expiresAt: number;
    lastFetched: number;
}

export class StaffService {
    private repository = new StaffRepository();
    private cache = new Map<string, CachedStaff>();
    private metrics = new Map<string, StaffMetrics>();
    private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async listStaff(tenantId: string | undefined, activeOnly: boolean = false, includeStats: boolean = false) {
        const startTime = Date.now();
        const cacheKey = `${tenantId || 'public'}_${activeOnly}_${includeStats}`;
        
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
                staff = await Promise.all(staff.map(async member => ({
                    ...member,
                    weeklyWorkingHours: StaffUtils.getWeeklyWorkingHours(member),
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
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error fetching staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getStaff(id: string, tenantId: string, includeStats: boolean = false) {
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
                    weeklyWorkingHours: StaffUtils.getWeeklyWorkingHours(staff),
                    appointmentCount: await this.repository.getAppointmentCount(id),
                    serviceCount: staff.staffServices?.length || 0,
                    hasSchedule: staff.weeklySchedule && staff.weeklySchedule.length > 0,
                    upcomingTimeOff: await this.repository.getUpcomingTimeOff(id),
                };
            }

            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return staff;
        } catch (error) {
            logger.error({ err: error, tenantId, staffId: id }, 'Error fetching staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async createStaff(tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate input
            const validated = createStaffSchema.parse(data);
            
            // Check for duplicate email if provided
            if (validated.email) {
                const existing = await this.repository.findByEmail(tenantId, validated.email);
                if (existing) {
                    const error = new Error('Staff member with this email already exists');
                    (error as any).code = 'DUPLICATE_EMAIL';
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
            
            logger.info({ tenantId, staffId: staff.id, name: validated.name }, 'Staff member created successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return staff;
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error creating staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async updateStaff(id: string, tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate input
            const validated = updateStaffSchema.parse(data);
            
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
                    (error as any).code = 'DUPLICATE_EMAIL';
                    throw error;
                }
            }

            // Update staff member
            await this.repository.update(id, tenantId, validated);
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, staffId: id, changes: Object.keys(validated) }, 'Staff member updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return this.getStaff(id, tenantId);
        } catch (error) {
            logger.error({ err: error, tenantId, staffId: id }, 'Error updating staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async deleteStaff(id: string, tenantId: string) {
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
                logger.info({ tenantId, staffId: id, appointmentCount }, 'Staff member deactivated due to existing appointments');
            } else {
                await this.repository.softDelete(id, tenantId);
                logger.info({ tenantId, staffId: id }, 'Staff member deleted successfully');
            }

            // Clear cache
            this.clearCache(tenantId);
            
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, deactivated: appointmentCount > 0 };
        } catch (error) {
            logger.error({ err: error, tenantId, staffId: id }, 'Error deleting staff member');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getPublicStaff(tenantId: string) {
        return this.listStaff(tenantId, true); // true = activeOnly
    }

    async assignServices(staffId: string, tenantId: string, serviceIds: string[]) {
        const startTime = Date.now();
        
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }

            // Validate services belong to same tenant
            const services = await prisma.service.findMany({
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
            
            logger.info({ tenantId, staffId, serviceIds }, 'Services assigned to staff successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return this.getStaff(staffId, tenantId);
        } catch (error) {
            logger.error({ err: error, tenantId, staffId, serviceIds }, 'Error assigning services to staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async setSchedule(staffId: string, tenantId: string, schedules: any[]) {
        const startTime = Date.now();
        
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }

            // Validate schedules
            const validation = StaffValidation.validateWeeklySchedule(schedules);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            await this.repository.updateSchedule(staffId, schedules);
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, staffId, scheduleCount: schedules.length }, 'Staff schedule updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return this.getStaff(staffId, tenantId);
        } catch (error) {
            logger.error({ err: error, tenantId, staffId }, 'Error updating staff schedule');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async addTimeOff(staffId: string, tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate staff exists
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }

            // Validate time off data
            const validated = staffTimeOffSchema.parse(data);
            const validation = StaffValidation.validateTimeOff(validated);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            await this.repository.addTimeOff(staffId, validated);
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, staffId, timeOff: validated }, 'Time off added successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return this.getStaff(staffId, tenantId);
        } catch (error) {
            logger.error({ err: error, tenantId, staffId }, 'Error adding time off');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async addBulkTimeOff(tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate input
            const validated = bulkTimeOffSchema.parse(data);
            
            // Validate staff exist
            const staff = await this.repository.findByIds(validated.staffIds, tenantId);
            if (staff.length !== validated.staffIds.length) {
                throw new Error('One or more staff members not found');
            }

            // Validate time off data
            const validation = StaffValidation.validateTimeOff(validated.timeOff);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            // Add time off to all staff members
            const results = await Promise.all(
                validated.staffIds.map(staffId => 
                    this.repository.addTimeOff(staffId, validated.timeOff)
                )
            );
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, staffIds: validated.staffIds, count: results.length }, 'Bulk time off added successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return { success: true, count: results.length };
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error adding bulk time off');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getStaffAvailability(staffId: string, tenantId: string, date: Date) {
        const startTime = Date.now();
        
        try {
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }

            const isAvailable = StaffUtils.isStaffAvailable(staff, date);
            
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return {
                staffId,
                date,
                isAvailable,
                schedule: staff.weeklySchedule?.find((s: any) => s.dayOfWeek === date.getDay()),
                timeOffs: staff.timeOffs?.filter((timeOff: any) => {
                    const startDate = new Date(timeOff.date);
                    const endDate = timeOff.endDate ? new Date(timeOff.endDate) : startDate;
                    return date >= startDate && date <= endDate;
                }),
            };
        } catch (error) {
            logger.error({ err: error, tenantId, staffId, date }, 'Error checking staff availability');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getAvailableTimeSlots(staffId: string, tenantId: string, date: Date, serviceDuration: number) {
        const startTime = Date.now();
        
        try {
            const staff = await this.repository.findById(staffId, tenantId);
            if (!staff) {
                throw new Error('Staff member not found');
            }

            const slots = StaffUtils.getAvailableTimeSlots(staff, date, serviceDuration);
            
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return {
                staffId,
                date,
                serviceDuration,
                slots,
            };
        } catch (error) {
            logger.error({ err: error, tenantId, staffId, date }, 'Error getting available time slots');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async searchStaff(tenantId: string, query: string, activeOnly: boolean = true) {
        const staff = await this.listStaff(tenantId, activeOnly);
        return StaffUtils.searchStaff(staff, query);
    }

    // Performance and monitoring methods
    private updateMetrics(tenantId: string, isHit: boolean, responseTime: number): void {
        const existing = this.metrics.get(tenantId) || {
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            totalRequests: 0,
        };

        if (isHit) {
            existing.cacheHits++;
        } else {
            existing.cacheMisses++;
        }

        existing.totalRequests++;
        existing.averageResponseTime = 
            (existing.averageResponseTime * (existing.totalRequests - 1) + responseTime) / existing.totalRequests;

        this.metrics.set(tenantId, existing);
    }

    getMetrics(tenantId: string): StaffMetrics | undefined {
        return this.metrics.get(tenantId);
    }

    getCacheHitRate(tenantId: string): number {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.totalRequests === 0) return 0;
        return metrics.cacheHits / metrics.totalRequests;
    }

    clearCache(tenantId?: string): void {
        if (tenantId) {
            // Clear specific tenant's cache
            for (const key of this.cache.keys()) {
                if (key.startsWith(tenantId + '_')) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
        }
    }

    async healthCheck(): Promise<{ status: string; cacheSize: number; metrics: Record<string, any> }> {
        const summary: Record<string, any> = {};
        
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

export const staffService = new StaffService();
