"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
class TenantController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(req, res, next) {
        try {
            const tenant = await this.service.createTenant(req.body);
            res.status(201).json({
                success: true,
                data: tenant,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const id = req.params.id;
            const tenant = await this.service.getTenant(id);
            res.json({
                success: true,
                data: tenant,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const id = req.params.id;
            const tenant = await this.service.updateTenant(id, req.body);
            res.json({
                success: true,
                data: tenant,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const id = req.params.id;
            await this.service.deleteTenant(id);
            res.status(204).end();
        }
        catch (error) {
            next(error);
        }
    }
    async list(req, res, next) {
        try {
            const tenants = await this.service.getAllTenants();
            res.json({
                success: true,
                data: tenants,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TenantController = TenantController;
