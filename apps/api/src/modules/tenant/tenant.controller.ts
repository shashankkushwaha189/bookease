import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

export class TenantController {
    constructor(private service: TenantService) { }

    // Admin-only tenant management
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await this.service.createTenant(req.body);
            res.status(201).json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const tenant = await this.service.getTenant(id);
            res.json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const tenant = await this.service.updateTenant(id, req.body);
            res.json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            await this.service.deleteTenant(id);
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const tenants = await this.service.getAllTenants();
            res.json({
                success: true,
                data: tenants,
            });
        } catch (error) {
            next(error);
        }
    }

    // Public tenant endpoints (no auth required)
    async getPublicTenants(req: Request, res: Response, next: NextFunction) {
        try {
            const tenants = await this.service.getActiveTenants();
            // Only return essential public information
            const publicTenants = tenants.map(tenant => ({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: (tenant as any).domain || null,
                timezone: tenant.timezone,
            }));
            
            res.json({
                success: true,
                data: publicTenants,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPublicTenantBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const tenant = await this.service.getTenantBySlug(slug as string);
            
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
                domain: (tenant as any).domain || null,
                timezone: tenant.timezone,
            };

            res.json({
                success: true,
                data: publicTenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async getPublicTenantByDomain(req: Request, res: Response, next: NextFunction) {
        try {
            const { domain } = req.params;
            const tenant = await this.service.getTenantByDomain(domain as string);
            
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
                domain: (tenant as any).domain || null,
                timezone: tenant.timezone,
            };

            res.json({
                success: true,
                data: publicTenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async searchTenants(req: Request, res: Response, next: NextFunction) {
        try {
            const { query, limit = 10 } = req.query;
            const tenants = await this.service.searchTenants(query as string, Number(limit));
            
            // Only return public-safe information
            const publicTenants = tenants.map(tenant => ({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                domain: (tenant as any).domain || null,
                timezone: tenant.timezone,
            }));

            res.json({
                success: true,
                data: publicTenants,
            });
        } catch (error) {
            next(error);
        }
    }

    // Tenant validation
    async validateTenantAccess(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { tenantSlug } = req.query;
            
            const isValid = await this.service.validateTenantAccess(tenantId, tenantSlug as string);
            
            res.json({
                success: true,
                data: { isValid, tenantId },
            });
        } catch (error) {
            next(error);
        }
    }
}
