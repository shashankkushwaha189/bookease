import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AppError } from '../../lib/errors';

export class AuthController {
    constructor(private service: AuthService) { }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Handle multiple tenant identification methods
            const tenantId = req.header('X-Tenant-ID');
            const tenantSlug = req.header('X-Tenant-Slug') || req.query.tenantSlug;
            const tenantDomain = req.header('X-Tenant-Domain');
            
            // Resolve tenant using slug or domain if ID not provided or if ID looks like a slug
            let resolvedTenantId = tenantId;
            if (!resolvedTenantId || (resolvedTenantId && !resolvedTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
                const identifierToResolve = tenantSlug || tenantDomain || tenantId;
                if (identifierToResolve) {
                    const { TenantRepository } = require('../tenant/tenant.repository');
                    const tenantRepo = new TenantRepository();
                    
                    // Try to find by slug first
                    let tenant = await tenantRepo.findBySlug(identifierToResolve as string);
                    if (!tenant && tenantDomain) {
                        // Try by domain if slug didn't work
                        tenant = await tenantRepo.findByDomain(tenantDomain);
                    }
                    
                    if (tenant) {
                        resolvedTenantId = tenant.id;
                    }
                }
            }
            
            if (!resolvedTenantId) {
                return next(new AppError('Tenant identification required (X-Tenant-ID, X-Tenant-Slug, or X-Tenant-Domain)', 400, 'TENANT_ID_REQUIRED'));
            }
            
            const result = await this.service.login(resolvedTenantId, req.body);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Handle multiple tenant identification methods
            const tenantId = req.header('X-Tenant-ID');
            const tenantSlug = req.header('X-Tenant-Slug') || req.query.tenantSlug;
            const tenantDomain = req.header('X-Tenant-Domain');
            
            // Resolve tenant using slug or domain if ID not provided
            let resolvedTenantId = tenantId;
            if (!resolvedTenantId && (tenantSlug || tenantDomain)) {
                const { TenantRepository } = require('../tenant/tenant.repository');
                const tenantRepo = new TenantRepository();
                
                if (tenantSlug) {
                    const tenant = await tenantRepo.findBySlug(tenantSlug as string);
                    if (tenant) resolvedTenantId = tenant.id;
                } else if (tenantDomain) {
                    const tenant = await tenantRepo.findByDomain(tenantDomain as string);
                    if (tenant) resolvedTenantId = tenant.id;
                }
            }
            
            if (!resolvedTenantId) {
                return next(new AppError('Tenant identification required (X-Tenant-ID, X-Tenant-Slug, or X-Tenant-Domain)', 400, 'TENANT_ID_REQUIRED'));
            }
            
            const result = await this.service.register(resolvedTenantId, req.body);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response) => {
        // req.user is attached by authMiddleware
        res.json({
            success: true,
            data: {
                id: req.user?.id,
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                role: req.user?.role,
            },
        });
    };

    logout = async (req: Request, res: Response) => {
        // Placeholder for logout logic (e.g. token blocklisting in Redis)
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    };
}
