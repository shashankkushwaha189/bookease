import { ServiceRepository } from './service.repository';
import { createServiceSchema, updateServiceSchema, ServiceValidation, ServiceUtils } from './service.schema';
import { logger } from '@bookease/logger';
import { configService } from '../config/config.service';

interface ServiceMetrics {
    cacheHits: number;
    cacheMisses: number;
    averageResponseTime: number;
    totalRequests: number;
}

interface CachedService {
    services: any[];
    expiresAt: number;
    lastFetched: number;
}

export class ServiceService {
    private repository = new ServiceRepository();
    private cache = new Map<string, CachedService>();
    private metrics = new Map<string, ServiceMetrics>();
    private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async listServices(tenantId: string | undefined, activeOnly: boolean = false, includeStats: boolean = false) {
        const startTime = Date.now();
        const cacheKey = `${tenantId || 'public'}_${activeOnly}_${includeStats}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.updateMetrics(tenantId, true, Date.now() - startTime);
            return cached.services;
        }

        try {
            let services = await this.repository.findAll(tenantId, activeOnly);
            
            // Apply business logic filters based on config
            const config = await configService.getConfig(tenantId);
            if (!config.features.customerPortalEnabled && activeOnly) {
                services = services.filter(service => service.allowOnlineBooking);
            }

            // Add computed fields if requested
            if (includeStats) {
                services = await Promise.all(services.map(async service => ({
                    ...service,
                    totalDuration: ServiceUtils.calculateTotalDuration(service),
                    appointmentCount: await this.repository.getAppointmentCount(service.id),
                    isAvailable: ServiceUtils.isServiceAvailable(service),
                })));
            }

            // Cache the result
            this.cache.set(cacheKey, {
                services,
                expiresAt: Date.now() + this.CACHE_TTL_MS,
                lastFetched: Date.now(),
            });

            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return services;
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error fetching services');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getService(id: string, tenantId: string, includeStats: boolean = false) {
        const startTime = Date.now();
        
        try {
            const service = await this.repository.findById(id, tenantId);
            if (!service) {
                throw new Error('Service not found');
            }

            // Add computed fields if requested
            if (includeStats) {
                return {
                    ...service,
                    totalDuration: ServiceUtils.calculateTotalDuration(service),
                    appointmentCount: await this.repository.getAppointmentCount(id),
                    isAvailable: ServiceUtils.isServiceAvailable(service),
                };
            }

            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return service;
        } catch (error) {
            logger.error({ err: error, tenantId, serviceId: id }, 'Error fetching service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async createService(tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate input
            const validated = createServiceSchema.parse(data);
            
            // Additional business validations
            if (!ServiceValidation.validateTotalDuration(
                validated.durationMinutes,
                validated.bufferBefore,
                validated.bufferAfter
            )) {
                throw new Error('Total duration (service + buffers) cannot exceed 10 hours');
            }

            if (!ServiceValidation.validateAdvanceBooking(
                validated.minAdvanceBookingHours,
                validated.maxAdvanceBookingDays
            )) {
                throw new Error('Invalid advance booking settings');
            }

            // Check for duplicate name
            const existing = await this.repository.findByName(tenantId, validated.name);
            if (existing) {
                const error = new Error('Service with this name already exists');
                (error as any).code = 'DUPLICATE_NAME';
                throw error;
            }

            // Create service
            const service = await this.repository.create({
                ...validated,
                tenantId,
            });

            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, serviceId: service.id, name: validated.name }, 'Service created successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return service;
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error creating service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async updateService(id: string, tenantId: string, data: any) {
        const startTime = Date.now();
        
        try {
            // Validate input
            const validated = updateServiceSchema.parse(data);
            
            // Check if service exists
            const existing = await this.repository.findById(id, tenantId);
            if (!existing) {
                throw new Error('Service not found');
            }

            // Additional validations if fields are being updated
            if (validated.durationMinutes !== undefined || validated.bufferBefore !== undefined || validated.bufferAfter !== undefined) {
                const duration = validated.durationMinutes ?? existing.durationMinutes;
                const bufferBefore = validated.bufferBefore ?? existing.bufferBefore;
                const bufferAfter = validated.bufferAfter ?? existing.bufferAfter;
                
                if (!ServiceValidation.validateTotalDuration(duration, bufferBefore, bufferAfter)) {
                    throw new Error('Total duration (service + buffers) cannot exceed 10 hours');
                }
            }

            if (validated.minAdvanceBookingHours !== undefined || validated.maxAdvanceBookingDays !== undefined) {
                const minHours = validated.minAdvanceBookingHours ?? existing.minAdvanceBookingHours;
                const maxDays = validated.maxAdvanceBookingDays ?? existing.maxAdvanceBookingDays;
                
                if (!ServiceValidation.validateAdvanceBooking(minHours, maxDays)) {
                    throw new Error('Invalid advance booking settings');
                }
            }

            // Check for duplicate name if name is being changed
            if (validated.name && validated.name !== existing.name) {
                const duplicate = await this.repository.findByName(tenantId, validated.name);
                if (duplicate && duplicate.id !== id) {
                    const error = new Error('Service with this name already exists');
                    (error as any).code = 'DUPLICATE_NAME';
                    throw error;
                }
            }

            // Update service
            await this.repository.update(id, tenantId, validated);
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, serviceId: id, changes: Object.keys(validated) }, 'Service updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return this.getService(id, tenantId);
        } catch (error) {
            logger.error({ err: error, tenantId, serviceId: id }, 'Error updating service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async softDeleteService(id: string, tenantId: string) {
        const startTime = Date.now();
        
        try {
            // Check if service exists
            const service = await this.repository.findById(id, tenantId);
            if (!service) {
                throw new Error('Service not found');
            }

            // Check for existing appointments
            const appointmentCount = await this.repository.getAppointmentCount(id);
            if (appointmentCount > 0) {
                // Instead of deleting, deactivate the service
                await this.repository.update(id, tenantId, { isActive: false });
                logger.info({ tenantId, serviceId: id, appointmentCount }, 'Service deactivated due to existing appointments');
            } else {
                await this.repository.delete(id, tenantId);
                logger.info({ tenantId, serviceId: id }, 'Service deleted successfully');
            }

            // Clear cache
            this.clearCache(tenantId);
            
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, deactivated: appointmentCount > 0 };
        } catch (error) {
            logger.error({ err: error, tenantId, serviceId: id }, 'Error deleting service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async searchServices(tenantId: string, query: string, activeOnly: boolean = true) {
        const services = await this.listServices(tenantId, activeOnly);
        return ServiceUtils.searchServices(services, query);
    }

    async getServicesByCategory(tenantId: string, activeOnly: boolean = true) {
        const services = await this.listServices(tenantId, activeOnly);
        return ServiceUtils.groupServicesByCategory(services);
    }

    async assignServiceToStaff(serviceId: string, tenantId: string, staffIds: string[]) {
        const startTime = Date.now();
        
        try {
            // Validate service exists
            const service = await this.repository.findById(serviceId, tenantId);
            if (!service) {
                throw new Error('Service not found');
            }

            // Validate staff exist and belong to tenant
            const staff = await this.repository.validateStaffIds(staffIds, tenantId);
            if (staff.length !== staffIds.length) {
                throw new Error('One or more staff members not found');
            }

            // Create assignments
            await this.repository.assignServiceToStaff(serviceId, staffIds);
            
            // Clear cache
            this.clearCache(tenantId);
            
            logger.info({ tenantId, serviceId, staffIds }, 'Service assigned to staff successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            
            return { success: true, assignedCount: staffIds.length };
        } catch (error) {
            logger.error({ err: error, tenantId, serviceId, staffIds }, 'Error assigning service to staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }

    async getServiceStaff(serviceId: string, tenantId: string) {
        return this.repository.getServiceStaff(serviceId, tenantId);
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

    getMetrics(tenantId: string): ServiceMetrics | undefined {
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

export const serviceService = new ServiceService();
