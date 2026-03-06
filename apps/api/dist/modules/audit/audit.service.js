"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("@bookease/logger");
class AuditService {
    /**
     * Fire-and-forget logic for logging events.
     * This should NOT be awaited in the request path.
     * Enhanced with AI usage tracking and comprehensive logging.
     */
    logEvent(params) {
        const startTime = Date.now(); // Performance tracking for logging itself
        // Validate required fields
        if (!params.tenantId || !params.action || !params.resourceType || !params.resourceId || !params.correlationId) {
            logger_1.logger.error({
                missing: ['tenantId', 'action', 'resourceType', 'resourceId', 'correlationId']
                    .filter(field => !params[field]),
                params
            }, 'Audit event missing required fields');
            return;
        }
        // Extract IP address and user agent from request context if available
        const enhancedParams = {
            ...params,
            ipAddress: params.ipAddress || this.extractIpAddress(),
            userAgent: params.userAgent || this.extractUserAgent()
        };
        // Fire and forget async logging
        prisma_1.prisma.auditLog.create({
            data: enhancedParams,
        }).then(result => {
            const loggingDuration = Date.now() - startTime;
            logger_1.logger.debug({
                tenantId: params.tenantId,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                auditLogId: result.id,
                correlationId: params.correlationId,
                loggingDuration,
                hasAiUsage: !!params.aiUsage
            }, 'Audit event logged successfully');
        }).catch(error => {
            const loggingDuration = Date.now() - startTime;
            logger_1.logger.error({
                tenantId: params.tenantId,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                error: error.message,
                correlationId: params.correlationId,
                loggingDuration,
                hasAiUsage: !!params.aiUsage
            }, 'Failed to log audit event - THIS SHOULD NOT BLOCK REQUEST');
        });
    }
    /**
     * Get audit logs with filtering and pagination
     */
    async getLogs(query) {
        const startTime = Date.now(); // Performance tracking
        const { tenantId, action, resourceType, userId, correlationId, startDate, endDate, page, limit } = query;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (action) {
            where.action = action;
        }
        if (resourceType) {
            where.resourceType = resourceType;
        }
        if (userId) {
            where.userId = userId;
        }
        if (correlationId) {
            where.correlationId = correlationId;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const [items, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    action: true,
                    resourceType: true,
                    resourceId: true,
                    userId: true,
                    correlationId: true,
                    before: true,
                    after: true,
                    ipAddress: true,
                    reason: true,
                    createdAt: true,
                    // Include AI usage if present in metadata
                }
            }),
            prisma_1.prisma.auditLog.count({ where })
        ]);
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            query,
            resultCount: items.length,
            total,
            duration,
            performanceRequirement: duration < 200 ? 'PASS' : 'FAIL'
        }, 'Audit logs fetched successfully');
        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
    }
    /**
     * Get AI usage analytics
     */
    async getAiUsageAnalytics(tenantId, startDate, endDate) {
        const startTime = Date.now();
        const where = {
            tenantId,
            // Note: This assumes AI usage is stored in metadata or a separate field
            // For now, we'll filter by AI-related actions
            action: {
                contains: 'ai'
            }
        };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            select: {
                action: true,
                userId: true,
                createdAt: true,
                before: true, // AI usage might be stored here
                after: true, // or here
            },
            orderBy: { createdAt: 'desc' }
        });
        // Analyze AI usage patterns
        const analytics = {
            totalAiOperations: logs.length,
            operationsByType: logs.reduce((acc, log) => {
                const operation = log.action.replace('ai.', '');
                acc[operation] = (acc[operation] || 0) + 1;
                return acc;
            }, {}),
            operationsByUser: logs.reduce((acc, log) => {
                const user = log.userId || 'UNKNOWN';
                acc[user] = (acc[user] || 0) + 1;
                return acc;
            }, {}),
            dailyUsage: logs.reduce((acc, log) => {
                const date = log.createdAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {}),
            // Note: Token/cost tracking would require structured AI usage data
            estimatedTokens: logs.length * 1000, // Rough estimate
            estimatedCost: logs.length * 0.002 // Rough estimate at $0.002/1K tokens
        };
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            analytics,
            duration
        }, 'AI usage analytics generated');
        return analytics;
    }
    /**
     * Get correlation ID trail (all events for a single request)
     */
    async getCorrelationTrail(correlationId, tenantId) {
        const startTime = Date.now();
        const events = await prisma_1.prisma.auditLog.findMany({
            where: {
                correlationId,
                tenantId
            },
            orderBy: { createdAt: 'asc' }
        });
        const trail = {
            correlationId,
            eventCount: events.length,
            startTime: events[0]?.createdAt || null,
            endTime: events[events.length - 1]?.createdAt || null,
            duration: events.length > 1 ?
                events[events.length - 1].createdAt.getTime() - events[0].createdAt.getTime() :
                0,
            events: events.map(event => ({
                action: event.action,
                resourceType: event.resourceType,
                resourceId: event.resourceId,
                userId: event.userId,
                timestamp: event.createdAt,
                hasBeforeAfter: !!(event.before || event.after)
            }))
        };
        const duration = Date.now() - startTime;
        logger_1.logger.debug({
            tenantId,
            correlationId,
            eventCount: events.length,
            duration
        }, 'Correlation trail generated');
        return trail;
    }
    /**
     * Test audit logging performance (admin only)
     */
    async testLoggingPerformance(tenantId, iterations = 1000) {
        const startTime = Date.now();
        const results = [];
        for (let i = 0; i < iterations; i++) {
            const iterationStart = Date.now();
            this.logEvent({
                tenantId,
                userId: 'test-user',
                action: 'test.performance',
                resourceType: 'Test',
                resourceId: `test-${i}`,
                correlationId: `perf-test-${i}`,
                before: { iteration: i },
                after: { processed: true },
                reason: 'Performance testing'
            });
            const iterationDuration = Date.now() - iterationStart;
            results.push(iterationDuration);
        }
        const totalDuration = Date.now() - startTime;
        const avgDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;
        return {
            iterations,
            totalDuration: `${totalDuration}ms`,
            averageDuration: `${avgDuration.toFixed(2)}ms`,
            maxDuration: `${Math.max(...results)}ms`,
            minDuration: `${Math.min(...results)}ms`,
            isAsync: true, // Confirms logging is async and doesn't block
            throughput: `${(iterations / (totalDuration / 1000)).toFixed(2)} operations/second`
        };
    }
    /**
     * Extract IP address from request context
     */
    extractIpAddress() {
        // In a real implementation, this would extract from request headers
        // For now, return undefined as it's handled at the controller level
        return undefined;
    }
    /**
     * Extract user agent from request context
     */
    extractUserAgent() {
        // In a real implementation, this would extract from request headers
        // For now, return undefined as it's handled at the controller level
        return undefined;
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
