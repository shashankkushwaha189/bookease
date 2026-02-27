import { Request, Response, NextFunction } from 'express';
import { TenantRepository } from '../modules/tenant/tenant.repository';
import { logger } from '@bookease/logger';

const tenantRepository = new TenantRepository();

export const tenantMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Skip for health check
    if (req.path === '/health') {
        return next();
    }

    // Skip for auth login (tenant handled by login logic)
    if (req.path === '/api/auth/login' && req.method === 'POST') {
        return next();
    }

    const tenantId = req.header('X-Tenant-ID');

    if (!tenantId) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'TENANT_ID_REQUIRED',
                message: 'X-Tenant-ID header is missing',
            },
        });
    }

    try {
        const tenant = await tenantRepository.findById(tenantId);

        if (!tenant) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: 'Tenant not found',
                },
            });
        }

        if (!tenant.isActive) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'TENANT_INACTIVE',
                    message: 'Tenant is inactive',
                },
            });
        }

        if (tenant.deletedAt) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'TENANT_INACTIVE',
                    message: 'Tenant is soft-deleted',
                },
            });
        }

        // Attach to request
        req.tenant = tenant;
        req.tenantId = tenant.id;

        next();
    } catch (error) {
        logger.error({ err: error, tenantId }, 'Error resolving tenant');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to resolve tenant',
            },
        });
    }
};
