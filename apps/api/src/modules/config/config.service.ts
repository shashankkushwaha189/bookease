import { ConfigRepository } from './config.repository';
import { BookEaseConfig, DEFAULT_CONFIG, FeatureFlags, StaffPermissions, BookingPolicies } from './config.schema';
import { logger } from '@bookease/logger';

interface CachedConfig {
    config: BookEaseConfig;
    expiresAt: number;
    lastValidated: number;
}

interface ConfigMetrics {
    cacheHits: number;
    cacheMisses: number;
    fetchTime: number[];
    lastFetchTime: number;
}

export class ConfigService {
    private repository = new ConfigRepository();
    private cache = new Map<string, CachedConfig>();
    private metrics = new Map<string, ConfigMetrics>();
    private CACHE_TTL_MS = 30 * 1000;
    private VALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    private MAX_FETCH_TIME_SAMPLES = 100;

    async getConfig(tenantId: string): Promise<BookEaseConfig> {
        const startTime = Date.now();
        const cached = this.cache.get(tenantId);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            this.recordMetrics(tenantId, true, Date.now() - startTime);
            return cached.config;
        }

        try {
            const dbConfig = await this.repository.findCurrent(tenantId);
            const config = dbConfig ? (dbConfig.config as unknown as BookEaseConfig) : DEFAULT_CONFIG;

            // Validate config integrity
            this.validateConfig(config);

            this.cache.set(tenantId, {
                config,
                expiresAt: now + this.CACHE_TTL_MS,
                lastValidated: now,
            });

            this.recordMetrics(tenantId, false, Date.now() - startTime);
            return config;
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error fetching config, falling back to defaults');
            this.recordMetrics(tenantId, false, Date.now() - startTime);
            return DEFAULT_CONFIG;
        }
    }

    async saveConfig(
        tenantId: string,
        userId: string,
        config: BookEaseConfig,
        note?: string
    ) {
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

    async rollback(tenantId: string, userId: string, version: number) {
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
            config: historical.config as unknown as BookEaseConfig,
            createdBy: userId,
            note: `Rollback to version ${version}`,
            isActive: true,
        });

        // Invalidate cache
        this.cache.delete(tenantId);

        return newConfig;
    }

    async getHistory(tenantId: string) {
        return this.repository.listHistory(tenantId);
    }

    // Feature flag methods
    async isFeatureEnabled(tenantId: string, feature: keyof BookEaseConfig['features']): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return FeatureFlags.isEnabled(config, feature);
    }

    async getAllFeatures(tenantId: string): Promise<Record<string, boolean>> {
        const config = await this.getConfig(tenantId);
        return FeatureFlags.getAllFeatures(config);
    }

    async enableFeature(tenantId: string, userId: string, feature: keyof BookEaseConfig['features'], note?: string): Promise<void> {
        const config = await this.getConfig(tenantId);
        const updatedConfig = FeatureFlags.enableFeature(config, feature);
        await this.saveConfig(tenantId, userId, updatedConfig, note || `Enabled feature: ${feature}`);
    }

    async disableFeature(tenantId: string, userId: string, feature: keyof BookEaseConfig['features'], note?: string): Promise<void> {
        const config = await this.getConfig(tenantId);
        const updatedConfig = FeatureFlags.disableFeature(config, feature);
        await this.saveConfig(tenantId, userId, updatedConfig, note || `Disabled feature: ${feature}`);
    }

    // Permission methods
    async hasPermission(tenantId: string, permission: keyof BookEaseConfig['staff']): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return StaffPermissions.hasPermission(config, permission);
    }

    async canManageBookings(tenantId: string): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return StaffPermissions.canManageBookings(config);
    }

    async canManageBusiness(tenantId: string): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return StaffPermissions.canManageBusiness(config);
    }

    // Booking policy methods
    async isWithinAdvanceWindow(tenantId: string, appointmentTime: Date): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return BookingPolicies.isWithinAdvanceWindow(config, appointmentTime);
    }

    async canCancel(tenantId: string, appointmentTime: Date, isStaff: boolean = false): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return BookingPolicies.canCancel(config, appointmentTime, isStaff);
    }

    async isBusinessOpen(tenantId: string, date: Date): Promise<boolean> {
        const config = await this.getConfig(tenantId);
        return BookingPolicies.isBusinessOpen(config, date);
    }

    // Performance and monitoring methods
    private recordMetrics(tenantId: string, isHit: boolean, fetchTime: number): void {
        const existing = this.metrics.get(tenantId) || {
            cacheHits: 0,
            cacheMisses: 0,
            fetchTime: [],
            lastFetchTime: 0,
        };

        if (isHit) {
            existing.cacheHits++;
        } else {
            existing.cacheMisses++;
        }

        existing.fetchTime.push(fetchTime);
        if (existing.fetchTime.length > this.MAX_FETCH_TIME_SAMPLES) {
            existing.fetchTime.shift();
        }
        existing.lastFetchTime = Date.now();

        this.metrics.set(tenantId, existing);
    }

    getMetrics(tenantId: string): ConfigMetrics | undefined {
        return this.metrics.get(tenantId);
    }

    getCacheHitRate(tenantId: string): number {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.cacheHits + metrics.cacheMisses === 0) {
            return 0;
        }
        return metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses);
    }

    getAverageFetchTime(tenantId: string): number {
        const metrics = this.metrics.get(tenantId);
        if (!metrics || metrics.fetchTime.length === 0) {
            return 0;
        }
        return metrics.fetchTime.reduce((sum, time) => sum + time, 0) / metrics.fetchTime.length;
    }

    clearCache(tenantId?: string): void {
        if (tenantId) {
            this.cache.delete(tenantId);
            this.metrics.delete(tenantId);
        } else {
            this.cache.clear();
            this.metrics.clear();
        }
    }

    private validateConfig(config: BookEaseConfig): void {
        // Basic validation to ensure config structure is valid
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid config structure');
        }
        
        if (!config.booking || !config.features || !config.staff) {
            throw new Error('Missing required config sections');
        }

        // Validate critical numeric values
        if (config.booking.maxBookingsPerDay <= 0 || config.booking.maxBookingsPerDay > 1000) {
            logger.warn('Invalid maxBookingsPerDay detected, using default');
            config.booking.maxBookingsPerDay = DEFAULT_CONFIG.booking.maxBookingsPerDay;
        }

        if (config.booking.slotLockDurationMinutes <= 0 || config.booking.slotLockDurationMinutes > 60) {
            logger.warn('Invalid slotLockDurationMinutes detected, using default');
            config.booking.slotLockDurationMinutes = DEFAULT_CONFIG.booking.slotLockDurationMinutes;
        }
    }

    // Health check method
    async healthCheck(): Promise<{ status: string; cacheSize: number; metrics: Record<string, any> }> {
        const summary: Record<string, any> = {};
        
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

// Singleton for easy use elsewhere
export const configService = new ConfigService();
export const getConfig = (tenantId: string) => configService.getConfig(tenantId);
