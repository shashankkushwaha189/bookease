"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const availability_controller_1 = require("./availability.controller");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const performance_middleware_1 = require("../../middleware/performance.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply performance monitoring to all availability routes
router.use(performance_middleware_1.performanceMiddleware);
// Rate limiting for availability queries (handle 50+ concurrent requests)
const availabilityRateLimiter = (0, express_rate_limit_1.default)({
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
// Public endpoint with rate limiting
router.get('/', availabilityRateLimiter, tenant_middleware_1.tenantMiddleware, availability_controller_1.availabilityController.getAvailability);
// Admin monitoring endpoint for cache statistics
router.get('/stats', tenant_middleware_1.tenantMiddleware, auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), (req, res) => {
    const stats = availability_controller_1.availabilityController.getCacheStats();
    res.json({
        success: true,
        data: stats
    });
});
// Admin endpoint to manually invalidate cache
router.post('/invalidate-cache', tenant_middleware_1.tenantMiddleware, auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), (req, res) => {
    const tenantId = req.tenantId;
    const invalidatedCount = availability_controller_1.availabilityController.invalidateCache(tenantId);
    res.json({
        success: true,
        data: {
            message: `Invalidated ${invalidatedCount} cache entries for tenant`,
            invalidatedCount
        }
    });
});
// Admin endpoint for performance statistics
router.get('/performance', tenant_middleware_1.tenantMiddleware, auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), (req, res) => {
    const { getPerformanceStats } = require('../../middleware/performance.middleware');
    const stats = getPerformanceStats();
    res.json({
        success: true,
        data: stats
    });
});
exports.default = router;
