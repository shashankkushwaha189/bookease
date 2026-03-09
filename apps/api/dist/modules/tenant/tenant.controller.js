"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
class TenantController {
    service;
    constructor(service) {
        this.service = service;
    }
    // Admin-only tenant management
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
    // Public tenant endpoints (no auth required)
    async getPublicTenants(req, res, next) {
        try {
            const tenants = await this.service.getActiveTenants();
            // Only return essential public information
            const publicTenants = tenants.map(tenant => ({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: tenant.domain || null,
                timezone: tenant.timezone,
            }));
            res.json({
                success: true,
                data: publicTenants,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicTenantBySlug(req, res, next) {
        try {
            const { slug } = req.params;
            const tenant = await this.service.getTenantBySlug(slug);
            if (!tenant || !tenant.isActive) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Tenant not found or inactive',
                    },
                });
            }
            // Only return public-safe information
            const publicTenant = {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: tenant.domain || null,
                timezone: tenant.timezone,
            };
            res.json({
                success: true,
                data: publicTenant,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicTenantByDomain(req, res, next) {
        try {
            const { domain } = req.params;
            const tenant = await this.service.getTenantByDomain(domain);
            if (!tenant || !tenant.isActive) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Tenant not found or inactive',
                    },
                });
            }
            // Only return public-safe information
            const publicTenant = {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: tenant.domain || null,
                timezone: tenant.timezone,
            };
            res.json({
                success: true,
                data: publicTenant,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async searchTenants(req, res, next) {
        try {
            const { query, limit = 10 } = req.query;
            const tenants = await this.service.searchTenants(query, Number(limit));
            // Only return public-safe information
            const publicTenants = tenants.map(tenant => ({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: tenant.domain || null,
                timezone: tenant.timezone,
            }));
            res.json({
                success: true,
                data: publicTenants,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Tenant validation
    async validateTenantAccess(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { tenantSlug } = req.query;
            const isValid = await this.service.validateTenantAccess(tenantId, tenantSlug);
            res.json({
                success: true,
                data: { isValid, tenantId },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TenantController = TenantController;
