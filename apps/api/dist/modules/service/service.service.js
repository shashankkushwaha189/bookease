"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceService = exports.ServiceService = void 0;
const service_repository_1 = require("./service.repository");
const service_schema_1 = require("./service.schema");
const logger_1 = require("@bookease/logger");
const config_service_1 = require("../config/config.service");
class ServiceService {
    repository = new service_repository_1.ServiceRepository();
    cache = new Map();
    metrics = new Map();
    CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    async listServices(tenantId, activeOnly = false, includeStats = false) {
        const startTime = Date.now();
        const cacheKey = `${tenantId}_${activeOnly}_${includeStats}`;
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.updateMetrics(tenantId, true, Date.now() - startTime);
            return cached.services;
        }
        try {
            let services = await this.repository.findAll(tenantId, activeOnly);
            // Apply business logic filters based on config
            const config = await config_service_1.configService.getConfig(tenantId);
            if (!config.features.customerPortalEnabled && activeOnly) {
                services = services.filter(service => service.allowOnlineBooking);
            }
            // Add computed fields if requested
            if (includeStats) {
                services = await Promise.all(services.map(async (service) => ({
                    ...service,
                    totalDuration: service_schema_1.ServiceUtils.calculateTotalDuration(service),
                    appointmentCount: await this.repository.getAppointmentCount(service.id),
                    isAvailable: service_schema_1.ServiceUtils.isServiceAvailable(service),
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
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error fetching services');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getService(id, tenantId, includeStats = false) {
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
                    totalDuration: service_schema_1.ServiceUtils.calculateTotalDuration(service),
                    appointmentCount: await this.repository.getAppointmentCount(id),
                    isAvailable: service_schema_1.ServiceUtils.isServiceAvailable(service),
                };
            }
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return service;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, serviceId: id }, 'Error fetching service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async createService(tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate input
            const validated = service_schema_1.createServiceSchema.parse(data);
            // Additional business validations
            if (!service_schema_1.ServiceValidation.validateTotalDuration(validated.durationMinutes, validated.bufferBefore, validated.bufferAfter)) {
                throw new Error('Total duration (service + buffers) cannot exceed 10 hours');
            }
            if (!service_schema_1.ServiceValidation.validateAdvanceBooking(validated.minAdvanceBookingHours, validated.maxAdvanceBookingDays)) {
                throw new Error('Invalid advance booking settings');
            }
            // Check for duplicate name
            const existing = await this.repository.findByName(tenantId, validated.name);
            if (existing) {
                const error = new Error('Service with this name already exists');
                error.code = 'DUPLICATE_NAME';
                throw error;
            }
            // Create service
            const service = await this.repository.create({
                ...validated,
                tenantId,
            });
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, serviceId: service.id, name: validated.name }, 'Service created successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return service;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error creating service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async updateService(id, tenantId, data) {
        const startTime = Date.now();
        try {
            // Validate input
            const validated = service_schema_1.updateServiceSchema.parse(data);
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
                if (!service_schema_1.ServiceValidation.validateTotalDuration(duration, bufferBefore, bufferAfter)) {
                    throw new Error('Total duration (service + buffers) cannot exceed 10 hours');
                }
            }
            if (validated.minAdvanceBookingHours !== undefined || validated.maxAdvanceBookingDays !== undefined) {
                const minHours = validated.minAdvanceBookingHours ?? existing.minAdvanceBookingHours;
                const maxDays = validated.maxAdvanceBookingDays ?? existing.maxAdvanceBookingDays;
                if (!service_schema_1.ServiceValidation.validateAdvanceBooking(minHours, maxDays)) {
                    throw new Error('Invalid advance booking settings');
                }
            }
            // Check for duplicate name if name is being changed
            if (validated.name && validated.name !== existing.name) {
                const duplicate = await this.repository.findByName(tenantId, validated.name);
                if (duplicate && duplicate.id !== id) {
                    const error = new Error('Service with this name already exists');
                    error.code = 'DUPLICATE_NAME';
                    throw error;
                }
            }
            // Update service
            await this.repository.update(id, tenantId, validated);
            // Clear cache
            this.clearCache(tenantId);
            logger_1.logger.info({ tenantId, serviceId: id, changes: Object.keys(validated) }, 'Service updated successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return this.getService(id, tenantId);
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, serviceId: id }, 'Error updating service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async softDeleteService(id, tenantId) {
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
                logger_1.logger.info({ tenantId, serviceId: id, appointmentCount }, 'Service deactivated due to existing appointments');
            }
            else {
                await this.repository.delete(id, tenantId);
                logger_1.logger.info({ tenantId, serviceId: id }, 'Service deleted successfully');
            }
            // Clear cache
            this.clearCache(tenantId);
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, deactivated: appointmentCount > 0 };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, serviceId: id }, 'Error deleting service');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async searchServices(tenantId, query, activeOnly = true) {
        const services = await this.listServices(tenantId, activeOnly);
        return service_schema_1.ServiceUtils.searchServices(services, query);
    }
    async getServicesByCategory(tenantId, activeOnly = true) {
        const services = await this.listServices(tenantId, activeOnly);
        return service_schema_1.ServiceUtils.groupServicesByCategory(services);
    }
    async assignServiceToStaff(serviceId, tenantId, staffIds) {
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
            logger_1.logger.info({ tenantId, serviceId, staffIds }, 'Service assigned to staff successfully');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            return { success: true, assignedCount: staffIds.length };
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId, serviceId, staffIds }, 'Error assigning service to staff');
            this.updateMetrics(tenantId, false, Date.now() - startTime);
            throw error;
        }
    }
    async getServiceStaff(serviceId, tenantId) {
        return this.repository.getServiceStaff(serviceId, tenantId);
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
exports.ServiceService = ServiceService;
exports.serviceService = new ServiceService();
