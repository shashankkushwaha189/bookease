import { Request, Response } from 'express';
import { configService } from './config.service';
import { configSchema } from './config.schema';
import { logger } from '@bookease/logger';

export class ConfigController {
    async getCurrent(req: Request, res: Response) {
        try {
            const config = await configService.getConfig(req.tenantId!);
            res.json({
                success: true,
                data: config,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in getCurrent config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch configuration' },
            });
        }
    }

    async getHistory(req: Request, res: Response) {
        try {
            const history = await configService.getHistory(req.tenantId!);
            res.json({
                success: true,
                data: history,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in getHistory config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch configuration history' },
            });
        }
    }

    async save(req: Request, res: Response) {
        try {
            const validated = configSchema.safeParse(req.body.config);

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

            const newConfig = await configService.saveConfig(
                req.tenantId!,
                req.user?.id || 'system',
                validated.data,
                req.body.note
            );

            res.status(201).json({
                success: true,
                data: newConfig,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in save config');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save configuration' },
            });
        }
    }

    async rollback(req: Request, res: Response) {
        try {
            const version = parseInt(req.params.version as string);

            if (isNaN(version)) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Invalid version number' },
                });
            }

            const newConfig = await configService.rollback(
                req.tenantId!,
                req.user?.id || 'system',
                version
            );

            res.status(201).json({
                success: true,
                data: newConfig,
            });
        } catch (error: any) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in rollback config');

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

export const configController = new ConfigController();
