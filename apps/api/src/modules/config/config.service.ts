import { ConfigRepository } from './config.repository';
import { BookEaseConfig, DEFAULT_CONFIG } from './config.schema';
import { logger } from '@bookease/logger';

interface CachedConfig {
    config: BookEaseConfig;
    expiresAt: number;
}

export class ConfigService {
    private repository = new ConfigRepository();
    private cache = new Map<string, CachedConfig>();
    private CACHE_TTL_MS = 30 * 1000;

    async getConfig(tenantId: string): Promise<BookEaseConfig> {
        const cached = this.cache.get(tenantId);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            return cached.config;
        }

        try {
            const dbConfig = await this.repository.findCurrent(tenantId);
            const config = dbConfig ? (dbConfig.config as unknown as BookEaseConfig) : DEFAULT_CONFIG;

            this.cache.set(tenantId, {
                config,
                expiresAt: now + this.CACHE_TTL_MS,
            });

            return config;
        } catch (error) {
            logger.error({ err: error, tenantId }, 'Error fetching config, falling back to defaults');
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
}

// Singleton for easy use elsewhere
export const configService = new ConfigService();
export const getConfig = (tenantId: string) => configService.getConfig(tenantId);
