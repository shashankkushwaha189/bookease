import { Request, Response, NextFunction } from 'express';
import { TenantRepository } from '../modules/tenant/tenant.repository';
import { logger } from '@bookease/logger';

const tenantRepository = new TenantRepository();

// Simple in-memory cache for tenant resolution (5 minute TTL)
const tenantCache = new Map<string, { tenant: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // Skip for public routes (no tenant ID required)
    const publicRoutes = [
        '/api/public/services',
        '/api/public/staff',
        '/api/public/availability',
        '/api/public/bookings',
        '/api/public/profile',
        '/api/tenants/public',
        '/api/business-profile/public'
    ];
    
    if (publicRoutes.some(route => req.path.startsWith(route))) {
        return next();
    }

    const tenantId = req.header('X-Tenant-ID');
    const tenantSlug = req.header('X-Tenant-Slug') || req.query.tenantSlug;
    const tenantDomain = req.header('X-Tenant-Domain');

    let tenant = null;
    let resolvedTenantId = tenantId;

    try {
        // Try to resolve tenant by different methods
        if (tenantId) {
            tenant = await getTenantById(tenantId);
        } else if (tenantSlug) {
            tenant = await getTenantBySlug(tenantSlug as string);
            if (tenant) {
                resolvedTenantId = tenant.id;
            }
        } else if (tenantDomain) {
            tenant = await getTenantByDomain(tenantDomain as string);
            if (tenant) {
                resolvedTenantId = tenant.id;
            }
        }

        if (!tenant) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'TENANT_NOT_FOUND',
                    message: 'Tenant not found or invalid tenant identifier',
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

        // Attach tenant to request
        req.tenantId = resolvedTenantId;
        req.tenant = tenant;

        next();
    } catch (error) {
        logger.error({ error, tenantId }, 'Error resolving tenant');
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to resolve tenant',
            },
        });
    }
};

// Helper functions with caching
async function getTenantById(id: string) {
    const cacheKey = `id:${id}`;
    const cached = tenantCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
        return cached.tenant;
    }

    try {
        const tenant = await tenantRepository.findById(id);
        if (tenant) {
            tenantCache.set(cacheKey, {
                tenant,
                expires: Date.now() + CACHE_TTL
            });
        }
        return tenant;
    } catch (error) {
        logger.error({ error, tenantId: id }, 'Error fetching tenant by ID');
        return null;
    }
}

async function getTenantBySlug(slug: string) {
    const cacheKey = `slug:${slug}`;
    const cached = tenantCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
        return cached.tenant;
    }

    try {
        const tenant = await tenantRepository.findBySlug(slug);
        if (tenant) {
            tenantCache.set(cacheKey, {
                tenant,
                expires: Date.now() + CACHE_TTL
            });
        }
        return tenant;
    } catch (error) {
        logger.error({ error, slug }, 'Error fetching tenant by slug');
        return null;
    }
}

async function getTenantByDomain(domain: string) {
    const cacheKey = `domain:${domain}`;
    const cached = tenantCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
        return cached.tenant;
    }

    try {
        const tenant = await tenantRepository.findByDomain(domain);
        if (tenant) {
            tenantCache.set(cacheKey, {
                tenant,
                expires: Date.now() + CACHE_TTL
            });
        }
        return tenant;
    } catch (error) {
        logger.error({ error, domain }, 'Error fetching tenant by domain');
        return null;
    }
}

// Cache cleanup function (run periodically)
export const cleanupTenantCache = () => {
    const now = Date.now();
    for (const [key, value] of tenantCache.entries()) {
        if (value.expires <= now) {
            tenantCache.delete(key);
        }
    }
};

// Run cache cleanup every 5 minutes
setInterval(cleanupTenantCache, 5 * 60 * 1000);
