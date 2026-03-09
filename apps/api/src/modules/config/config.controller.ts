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

    // Feature flag endpoints
    async getFeatures(req: Request, res: Response) {
        try {
            const features = await configService.getAllFeatures(req.tenantId!);
            res.json({
                success: true,
                data: features,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in getFeatures');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch features' },
            });
        }
    }

    async enableFeature(req: Request, res: Response) {
        try {
            const { feature } = req.body;
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Feature name is required' },
                });
            }

            await configService.enableFeature(
                req.tenantId!,
                req.user?.id || 'system',
                feature,
                req.body.note
            );

            res.json({
                success: true,
                message: `Feature ${feature} enabled successfully`,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in enableFeature');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to enable feature' },
            });
        }
    }

    async disableFeature(req: Request, res: Response) {
        try {
            const { feature } = req.body;
            if (!feature) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Feature name is required' },
                });
            }

            await configService.disableFeature(
                req.tenantId!,
                req.user?.id || 'system',
                feature,
                req.body.note
            );

            res.json({
                success: true,
                message: `Feature ${feature} disabled successfully`,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in disableFeature');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to disable feature' },
            });
        }
    }

    // Permission check endpoints
    async checkPermission(req: Request, res: Response) {
        try {
            const { permission } = req.params;
            if (!permission) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'Permission name is required' },
                });
            }

            const hasPermission = await configService.hasPermission(req.tenantId!, permission as any);
            res.json({
                success: true,
                data: { permission, hasPermission },
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in checkPermission');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to check permission' },
            });
        }
    }

    // Policy validation endpoints
    async validateBookingWindow(req: Request, res: Response) {
        try {
            const { appointmentTime } = req.body;
            if (!appointmentTime) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'appointmentTime is required' },
                });
            }

            const isValid = await configService.isWithinAdvanceWindow(
                req.tenantId!,
                new Date(appointmentTime)
            );
            res.json({
                success: true,
                data: { isValid, appointmentTime },
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in validateBookingWindow');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to validate booking window' },
            });
        }
    }

    async validateCancellation(req: Request, res: Response) {
        try {
            const { appointmentTime, isStaff } = req.body;
            if (!appointmentTime) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'appointmentTime is required' },
                });
            }

            const canCancel = await configService.canCancel(
                req.tenantId!,
                new Date(appointmentTime),
                isStaff || false
            );
            res.json({
                success: true,
                data: { canCancel, appointmentTime, isStaff },
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in validateCancellation');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to validate cancellation' },
            });
        }
    }

    async checkBusinessHours(req: Request, res: Response) {
        try {
            const { date } = req.body;
            if (!date) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'BAD_REQUEST', message: 'date is required' },
                });
            }

            const isOpen = await configService.isBusinessOpen(req.tenantId!, new Date(date));
            res.json({
                success: true,
                data: { isOpen, date },
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in checkBusinessHours');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to check business hours' },
            });
        }
    }

    // Performance and monitoring endpoints
    async getMetrics(req: Request, res: Response) {
        try {
            const metrics = configService.getMetrics(req.tenantId!);
            const cacheHitRate = configService.getCacheHitRate(req.tenantId!);
            const averageFetchTime = configService.getAverageFetchTime(req.tenantId!);

            res.json({
                success: true,
                data: {
                    metrics,
                    cacheHitRate,
                    averageFetchTime,
                },
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in getMetrics');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch metrics' },
            });
        }
    }

    async healthCheck(req: Request, res: Response) {
        try {
            const health = await configService.healthCheck();
            res.json({
                success: true,
                data: health,
            });
        } catch (error) {
            logger.error({ err: error }, 'Error in healthCheck');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Health check failed' },
            });
        }
    }

    async clearCache(req: Request, res: Response) {
        try {
            configService.clearCache(req.tenantId!);
            res.json({
                success: true,
                message: 'Cache cleared successfully',
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error in clearCache');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to clear cache' },
            });
        }
    }
}

export const configController = new ConfigController();
