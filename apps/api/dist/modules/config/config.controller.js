"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configController = exports.ConfigController = void 0;
const config_service_1 = require("./config.service");
const config_schema_1 = require("./config.schema");
const logger_1 = require("@bookease/logger");
class ConfigController {
    async getCurrent(req, res) {
        try {
            const config = await config_service_1.configService.getConfig(req.tenantId);
            res.json({
                success: true,
                data: config,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in getCurrent config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch configuration' },
            });
        }
    }
    async getHistory(req, res) {
        try {
            const history = await config_service_1.configService.getHistory(req.tenantId);
            res.json({
                success: true,
                data: history,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in getHistory config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch configuration history' },
            });
        }
    }
    async save(req, res) {
        try {
            const validated = config_schema_1.configSchema.safeParse(req.body.config);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid configuration shape',
                        details: validated.error.format(),
                    },
                });
            }
            const newConfig = await config_service_1.configService.saveConfig(req.tenantId, req.user?.id || 'system', validated.data, req.body.note);
            res.status(201).json({
                success: true,
                data: newConfig,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in save config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save configuration' },
            });
        }
    }
    async rollback(req, res) {
        try {
            const version = parseInt(req.params.version);
            if (isNaN(version)) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Invalid version number' },
                });
            }
            const newConfig = await config_service_1.configService.rollback(req.tenantId, req.user?.id || 'system', version);
            res.status(201).json({
                success: true,
                data: newConfig,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in rollback config');
            if (error.message?.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: error.message },
                });
            }
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to rollback configuration' },
            });
        }
    }
    // Feature flag endpoints
    async getFeatures(req, res) {
        try {
            const features = await config_service_1.configService.getAllFeatures(req.tenantId);
            res.json({
                success: true,
                data: features,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in getFeatures');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch features' },
            });
        }
    }
    async enableFeature(req, res) {
        try {
            const { feature } = req.body;
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Feature name is required' },
                });
            }
            await config_service_1.configService.enableFeature(req.tenantId, req.user?.id || 'system', feature, req.body.note);
            res.json({
                success: true,
                message: `Feature ${feature} enabled successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in enableFeature');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to enable feature' },
            });
        }
    }
    async disableFeature(req, res) {
        try {
            const { feature } = req.body;
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Feature name is required' },
                });
            }
            await config_service_1.configService.disableFeature(req.tenantId, req.user?.id || 'system', feature, req.body.note);
            res.json({
                success: true,
                message: `Feature ${feature} disabled successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in disableFeature');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to disable feature' },
            });
        }
    }
    // Permission check endpoints
    async checkPermission(req, res) {
        try {
            const { permission } = req.params;
            if (!permission) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Permission name is required' },
                });
            }
            const hasPermission = await config_service_1.configService.hasPermission(req.tenantId, permission);
            res.json({
                success: true,
                data: { permission, hasPermission },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in checkPermission');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to check permission' },
            });
        }
    }
    // Policy validation endpoints
    async validateBookingWindow(req, res) {
        try {
            const { appointmentTime } = req.body;
            if (!appointmentTime) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'appointmentTime is required' },
                });
            }
            const isValid = await config_service_1.configService.isWithinAdvanceWindow(req.tenantId, new Date(appointmentTime));
            res.json({
                success: true,
                data: { isValid, appointmentTime },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in validateBookingWindow');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to validate booking window' },
            });
        }
    }
    async validateCancellation(req, res) {
        try {
            const { appointmentTime, isStaff } = req.body;
            if (!appointmentTime) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'appointmentTime is required' },
                });
            }
            const canCancel = await config_service_1.configService.canCancel(req.tenantId, new Date(appointmentTime), isStaff || false);
            res.json({
                success: true,
                data: { canCancel, appointmentTime, isStaff },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in validateCancellation');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to validate cancellation' },
            });
        }
    }
    async checkBusinessHours(req, res) {
        try {
            const { date } = req.body;
            if (!date) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'date is required' },
                });
            }
            const isOpen = await config_service_1.configService.isBusinessOpen(req.tenantId, new Date(date));
            res.json({
                success: true,
                data: { isOpen, date },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in checkBusinessHours');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to check business hours' },
            });
        }
    }
    // Performance and monitoring endpoints
    async getMetrics(req, res) {
        try {
            const metrics = config_service_1.configService.getMetrics(req.tenantId);
            const cacheHitRate = config_service_1.configService.getCacheHitRate(req.tenantId);
            const averageFetchTime = config_service_1.configService.getAverageFetchTime(req.tenantId);
            res.json({
                success: true,
                data: {
                    metrics,
                    cacheHitRate,
                    averageFetchTime,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in getMetrics');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch metrics' },
            });
        }
    }
    async healthCheck(req, res) {
        try {
            const health = await config_service_1.configService.healthCheck();
            res.json({
                success: true,
                data: health,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Error in healthCheck');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Health check failed' },
            });
        }
    }
    async clearCache(req, res) {
        try {
            config_service_1.configService.clearCache(req.tenantId);
            res.json({
                success: true,
                message: 'Cache cleared successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error in clearCache');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to clear cache' },
            });
        }
    }
}
exports.ConfigController = ConfigController;
exports.configController = new ConfigController();
