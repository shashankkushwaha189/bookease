"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.configService = exports.ConfigService = void 0;
const config_repository_1 = require("./config.repository");
const config_schema_1 = require("./config.schema");
const logger_1 = require("@bookease/logger");
class ConfigService {
    repository = new config_repository_1.ConfigRepository();
    cache = new Map();
    metrics = new Map();
    CACHE_TTL_MS = 30 * 1000;
    VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    MAX_FETCH_TIME_SAMPLES = 100;
    async getConfig(tenantId) {
        const startTime = Date.now();
        const cached = this.cache.get(tenantId);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            this.recordMetrics(tenantId, true, Date.now() - startTime);
            return cached.config;
        }
        try {
            const dbConfig = await this.repository.findCurrent(tenantId);
            const config = dbConfig ? dbConfig.config : config_schema_1.DEFAULT_CONFIG;
            // Validate config integrity
            this.validateConfig(config);
            this.cache.set(tenantId, {
                config,
                expiresAt: now + this.CACHE_TTL_MS,
                lastValidated: now,
            });
            this.recordMetrics(tenantId, false, Date.now() - startTime);
            return config;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error fetching config, falling back to defaults');
            this.recordMetrics(tenantId, false, Date.now() - startTime);
            return config_schema_1.DEFAULT_CONFIG;
        }
    }
    async saveConfig(tenantId, userId, config, note) {
        const latestVersion = await this.repository.getLatestVersion(tenantId);
        const nextVersion = latestVersion + 1;
        await this.repository.deactivateAll(tenantId);
        const newConfig = await this.repository.create({
            tenantId,
            version: nextVersion,
            config,
            createdBy: userId,
            note,
            isActive: true,
        });
        // Invalidate cache
        this.cache.delete(tenantId);
        return newConfig;
    }
    async rollback(tenantId, userId, version) {
        const historical = await this.repository.findByVersion(tenantId, version);
        if (!historical) {
            throw new Error(`Version ${version} not found`);
        }
        const latestVersion = await this.repository.getLatestVersion(tenantId);
        const nextVersion = latestVersion + 1;
        await this.repository.deactivateAll(tenantId);
        const newConfig = await this.repository.create({
            tenantId,
            version: nextVersion,
            config: historical.config,
            createdBy: userId,
            note: `Rollback to version ${version}`,
            isActive: true,
        });
        // Invalidate cache
        this.cache.delete(tenantId);
        return newConfig;
    }
    async getHistory(tenantId) {
        return this.repository.listHistory(tenantId);
    }
    // Feature flag methods
    async isFeatureEnabled(tenantId, feature) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.FeatureFlags.isEnabled(config, feature);
    }
    async getAllFeatures(tenantId) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.FeatureFlags.getAllFeatures(config);
    }
    async enableFeature(tenantId, userId, feature, note) {
        const config = await this.getConfig(tenantId);
        const updatedConfig = config_schema_1.FeatureFlags.enableFeature(config, feature);
        await this.saveConfig(tenantId, userId, updatedConfig, note || `Enabled feature: ${feature}`);
    }
    async disableFeature(tenantId, userId, feature, note) {
        const config = await this.getConfig(tenantId);
        const updatedConfig = config_schema_1.FeatureFlags.disableFeature(config, feature);
        await this.saveConfig(tenantId, userId, updatedConfig, note || `Disabled feature: ${feature}`);
    }
    // Permission methods
    async hasPermission(tenantId, permission) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.StaffPermissions.hasPermission(config, permission);
    }
    async canManageBookings(tenantId) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.StaffPermissions.canManageBookings(config);
    }
    async canManageBusiness(tenantId) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.StaffPermissions.canManageBusiness(config);
    }
    // Booking policy methods
    async isWithinAdvanceWindow(tenantId, appointmentTime) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.BookingPolicies.isWithinAdvanceWindow(config, appointmentTime);
    }
    async canCancel(tenantId, appointmentTime, isStaff = false) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.BookingPolicies.canCancel(config, appointmentTime, isStaff);
    }
    async isBusinessOpen(tenantId, date) {
        const config = await this.getConfig(tenantId);
        return config_schema_1.BookingPolicies.isBusinessOpen(config, date);
    }
    // Performance and monitoring methods
    recordMetrics(tenantId, isHit, fetchTime) {
        const existing = this.metrics.get(tenantId) || {
            cacheHits: 0,
            cacheMisses: 0,
            fetchTime: [],
            lastFetchTime: 0,
        };
        if (isHit) {
            existing.cacheHits++;
        }
        else {
            existing.cacheMisses++;
        }
        existing.fetchTime.push(fetchTime);
        if (existing.fetchTime.length > this.MAX_FETCH_TIME_SAMPLES) {
            existing.fetchTime.shift();
        }
        existing.lastFetchTime = Date.now();
        this.metrics.set(tenantId, existing);
    }
    getMetrics(tenantId) {
        return this.metrics.get(tenantId);
    }
    getCacheHitRate(tenantId) {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.cacheHits + metrics.cacheMisses === 0) {
            return 0;
        }
        return metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
    }
    getAverageFetchTime(tenantId) {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.fetchTime.length === 0) {
            return 0;
        }
        return metrics.fetchTime.reduce((sum, time) => sum + time, 0) / metrics.fetchTime.length;
    }
    clearCache(tenantId) {
        if (tenantId) {
            this.cache.delete(tenantId);
            this.metrics.delete(tenantId);
        }
        else {
            this.cache.clear();
            this.metrics.clear();
        }
    }
    validateConfig(config) {
        // Basic validation to ensure config structure is valid
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid config structure');
        }
        if (!config.booking || !config.features || !config.staff) {
            throw new Error('Missing required config sections');
        }
        // Validate critical numeric values
        if (config.booking.maxBookingsPerDay <= 0 || config.booking.maxBookingsPerDay > 1000) {
            logger_1.logger.warn('Invalid maxBookingsPerDay detected, using default');
            config.booking.maxBookingsPerDay = config_schema_1.DEFAULT_CONFIG.booking.maxBookingsPerDay;
        }
        if (config.booking.slotLockDurationMinutes <= 0 || config.booking.slotLockDurationMinutes > 60) {
            logger_1.logger.warn('Invalid slotLockDurationMinutes detected, using default');
            config.booking.slotLockDurationMinutes = config_schema_1.DEFAULT_CONFIG.booking.slotLockDurationMinutes;
        }
    }
    // Health check method
    async healthCheck() {
        const summary = {};
        for (const [tenantId, metrics] of this.metrics.entries()) {
            summary[tenantId] = {
                cacheHitRate: this.getCacheHitRate(tenantId),
                averageFetchTime: this.getAverageFetchTime(tenantId),
                totalRequests: metrics.cacheHits + metrics.cacheMisses,
            };
        }
        return {
            status: 'healthy',
            cacheSize: this.cache.size,
            metrics: summary,
        };
    }
}
exports.ConfigService = ConfigService;
// Singleton for easy use elsewhere
exports.configService = new ConfigService();
const getConfig = (tenantId) => exports.configService.getConfig(tenantId);
exports.getConfig = getConfig;
