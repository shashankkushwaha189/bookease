"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceController = exports.ServiceController = void 0;
const service_service_1 = require("./service.service");
const service_schema_1 = require("./service.schema");
const logger_1 = require("@bookease/logger");
class ServiceController {
    async list(req, res) {
        try {
            const activeOnly = req.originalUrl.includes('/public/');
            const services = await service_service_1.serviceService.listServices(req.tenantId, activeOnly);
            res.json({
                success: true,
                data: services,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error listing services');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch services' },
            });
        }
    }
    async create(req, res) {
        try {
            const validated = service_schema_1.createServiceSchema.safeParse(req.body);
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
            const service = await service_service_1.serviceService.createService(req.tenantId, validated.data);
            res.status(201).json({
                success: true,
                data: service,
            });
        }
        catch (error) {
            if (error.code === 'DUPLICATE_NAME') {
                return res.status(409).json({
                    success: false,
                    error: { code: 'CONFLICT', message: error.message },
                });
            }
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error creating service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create service' },
            });
        }
    }
    async update(req, res) {
        try {
            const validated = service_schema_1.updateServiceSchema.safeParse(req.body);
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
            const service = await service_service_1.serviceService.updateService(req.params.id, req.tenantId, validated.data);
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
        }
        catch (error) {
            if (error.code === 'DUPLICATE_NAME') {
                return res.status(409).json({
                    success: false,
                    error: { code: 'CONFLICT', message: error.message },
                });
            }
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error updating service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update service' },
            });
        }
    }
    async delete(req, res) {
        try {
            await service_service_1.serviceService.softDeleteService(req.params.id, req.tenantId);
            res.json({
                success: true,
                message: 'Service soft-deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error deleting service');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete service' },
            });
        }
    }
}
exports.ServiceController = ServiceController;
exports.serviceController = new ServiceController();
