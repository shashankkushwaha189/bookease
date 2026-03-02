import { Request, Response } from 'express';
import { serviceService } from './service.service';
import { createServiceSchema, updateServiceSchema } from './service.schema';
import { logger } from '@bookease/logger';

export class ServiceController {
    async list(req: Request, res: Response) {
        try {
            const activeOnly = req.originalUrl.includes('/public/');
            const services = await serviceService.listServices(req.tenantId!, activeOnly);
            res.json({
                success: true,
                data: services,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error listing services');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch services' },
            });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const validated = createServiceSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid service data',
                        details: validated.error.format(),
                    },
                });
            }

            const service = await serviceService.createService(req.tenantId!, validated.data);
            res.status(201).json({
                success: true,
                data: service,
            });
        } catch (error: any) {
            if (error.code === 'DUPLICATE_NAME') {
                return res.status(409).json({
                    success: false,
                    error: { code: 'CONFLICT', message: error.message },
                });
            }
            logger.error({ err: error, tenantId: req.tenantId }, 'Error creating service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create service' },
            });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const validated = updateServiceSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid service data',
                        details: validated.error.format(),
                    },
                });
            }

            const service = await serviceService.updateService(req.params.id as string, req.tenantId!, validated.data);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Service not found' },
                });
            }

            res.json({
                success: true,
                data: service,
            });
        } catch (error: any) {
            if (error.code === 'DUPLICATE_NAME') {
                return res.status(409).json({
                    success: false,
                    error: { code: 'CONFLICT', message: error.message },
                });
            }
            logger.error({ err: error, tenantId: req.tenantId }, 'Error updating service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update service' },
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await serviceService.softDeleteService(req.params.id as string, req.tenantId!);
            res.json({
                success: true,
                message: 'Service soft-deleted successfully',
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error deleting service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete service' },
            });
        }
    }
}

export const serviceController = new ServiceController();
