"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.configService = exports.ConfigService = void 0;
const config_repository_1 = require("./config.repository");
const config_schema_1 = require("./config.schema");
const logger_1 = require("@bookease/logger");
class ConfigService {
    repository = new config_repository_1.ConfigRepository();
    cache = new Map();
    CACHE_TTL_MS = 30 * 1000;
    async getConfig(tenantId) {
        const cached = this.cache.get(tenantId);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
            return cached.config;
        }
        try {
            const dbConfig = await this.repository.findCurrent(tenantId);
            const config = dbConfig ? dbConfig.config : config_schema_1.DEFAULT_CONFIG;
            this.cache.set(tenantId, {
                config,
                expiresAt: now + this.CACHE_TTL_MS,
            });
            return config;
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId }, 'Error fetching config, falling back to defaults');
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
}
exports.ConfigService = ConfigService;
// Singleton for easy use elsewhere
exports.configService = new ConfigService();
const getConfig = (tenantId) => exports.configService.getConfig(tenantId);
exports.getConfig = getConfig;
