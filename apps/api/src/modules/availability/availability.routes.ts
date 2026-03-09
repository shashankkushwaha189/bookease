import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { availabilityController } from './availability.controller';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { performanceMiddleware } from '../../middleware/performance.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply performance monitoring to all availability routes
router.use(performanceMiddleware);

// Rate limiting for availability queries (handle 50+ concurrent requests)
const availabilityRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many availability requests. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});

// Public endpoint with rate limiting (no tenant middleware for public access)
router.get('/', availabilityRateLimiter, availabilityController.getAvailability);

// Protected endpoint with rate limiting and tenant middleware
router.get('/protected', availabilityRateLimiter, tenantMiddleware, availabilityController.getAvailability);

// Admin monitoring endpoint for cache statistics
router.get('/stats', 
    tenantMiddleware, 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    (req, res) => {
        const stats = availabilityController.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    }
);

// Admin endpoint to manually invalidate cache
router.post('/invalidate-cache', 
    tenantMiddleware, 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    (req, res) => {
        const tenantId = req.tenantId!;
        const invalidatedCount = availabilityController.invalidateCache(tenantId);
        res.json({
            success: true,
            data: {
                message: `Invalidated ${invalidatedCount} cache entries for tenant`,
                invalidatedCount
            }
        });
    }
);

// Admin endpoint for performance statistics
router.get('/performance', 
    tenantMiddleware, 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    (req, res) => {
        const { getPerformanceStats } = require('../../middleware/performance.middleware');
        const stats = getPerformanceStats();
        res.json({
            success: true,
            data: stats
        });
    }
);

export default router;
