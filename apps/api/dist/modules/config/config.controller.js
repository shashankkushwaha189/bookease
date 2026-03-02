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
}
exports.ConfigController = ConfigController;
exports.configController = new ConfigController();
