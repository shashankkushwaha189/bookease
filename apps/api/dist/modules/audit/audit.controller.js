"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditController = exports.AuditController = void 0;
const audit_service_1 = require("./audit.service");
const logger_1 = require("@bookease/logger");
class AuditController {
    /**
     * Get audit logs with comprehensive filtering
     */
    getLogs = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { page = 1, limit = 50, action, resourceType, userId, correlationId, startDate, endDate } = req.query;
            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            const query = {
                tenantId,
                page: Number(page),
                limit: Math.min(Number(limit), 100), // Cap at 100 for performance
                action: action,
                resourceType: resourceType,
                userId: userId,
                correlationId: correlationId,
                startDate: startDate,
                endDate: endDate
            };
            const result = await audit_service_1.auditService.getLogs(query);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                query: req.query
            }, 'Get audit logs failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get audit logs'
                }
            });
        }
    };
    /**
     * Get AI usage analytics
     */
    getAiUsageAnalytics = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { startDate, endDate } = req.query;
            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to view AI usage analytics'
                    }
                });
            }
            const analytics = await audit_service_1.auditService.getAiUsageAnalytics(tenantId, startDate, endDate);
            res.json({
                success: true,
                data: analytics
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id']
            }, 'Get AI usage analytics failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get AI usage analytics'
                }
            });
        }
    };
    /**
     * Get correlation trail for a specific request
     */
    getCorrelationTrail = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { correlationId } = req.params;
            // Validate required parameters
            if (!tenantId || !correlationId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Tenant ID and correlation ID are required'
                    }
                });
            }
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to view correlation trails'
                    }
                });
            }
            const correlationIdStr = Array.isArray(correlationId) ? correlationId[0] : correlationId;
            const trail = await audit_service_1.auditService.getCorrelationTrail(correlationIdStr, tenantId);
            res.json({
                success: true,
                data: trail
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                correlationId: req.params.correlationId
            }, 'Get correlation trail failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get correlation trail'
                }
            });
        }
    };
    /**
     * Test audit logging performance (admin only)
     */
    testLoggingPerformance = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { iterations = 1000 } = req.body;
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to test audit performance'
                    }
                });
            }
            // Validate iterations
            if (iterations < 1 || iterations > 10000) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ITERATIONS',
                        message: 'Iterations must be between 1 and 10000'
                    }
                });
            }
            const performance = await audit_service_1.auditService.testLoggingPerformance(tenantId, Number(iterations));
            logger_1.logger.info({
                tenantId,
                performance
            }, 'Audit logging performance test completed');
            res.json({
                success: true,
                data: {
                    ...performance,
                    meetsRequirement: parseFloat(performance.averageDuration) < 10, // Should be very fast for async
                    isNonBlocking: performance.isAsync
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id']
            }, 'Audit logging performance test failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to test audit logging performance'
                }
            });
        }
    };
    /**
     * Create a test audit event (for testing purposes)
     */
    createTestEvent = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { action, resourceType, resourceId, reason } = req.body;
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to create test events'
                    }
                });
            }
            // Generate correlation ID
            const correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Log the event (this should be async and not block)
            const startTime = Date.now();
            audit_service_1.auditService.logEvent({
                tenantId,
                userId: req.user?.id || 'test-admin',
                action: action || 'test.event',
                resourceType: resourceType || 'Test',
                resourceId: resourceId || `test-${Date.now()}`,
                correlationId,
                before: { test: true },
                after: { processed: true },
                reason: reason || 'Test event creation',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            const duration = Date.now() - startTime;
            res.json({
                success: true,
                data: {
                    correlationId,
                    logged: true,
                    duration: `${duration}ms`,
                    isAsync: true,
                    message: 'Test event logged asynchronously'
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id']
            }, 'Create test audit event failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create test audit event'
                }
            });
        }
    };
}
exports.AuditController = AuditController;
exports.auditController = new AuditController();
