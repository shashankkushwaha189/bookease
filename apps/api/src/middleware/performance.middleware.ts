import { Request, Response, NextFunction } from 'express';
import { logger } from '@bookease/logger';

interface RequestMetrics {
    startTime: number;
    endpoint: string;
    tenantId?: string;
}

// Store active requests for concurrent monitoring
const activeRequests = new Map<string, RequestMetrics>();

// Performance metrics
let totalRequests = 0;
let concurrentRequests = 0;
let maxConcurrentRequests = 0;
let totalResponseTime = 0;

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    totalRequests++;
    concurrentRequests++;
    
    if (concurrentRequests > maxConcurrentRequests) {
        maxConcurrentRequests = concurrentRequests;
    }

    // Store request metrics
    const metrics: RequestMetrics = {
        startTime,
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        tenantId: req.tenantId
    };
    
    activeRequests.set(requestId, metrics);

    // Log concurrent request info
    if (concurrentRequests > 10) { // Log when we have high concurrency
        logger.info({
            concurrentRequests,
            maxConcurrentRequests,
            endpoint: metrics.endpoint,
            tenantId: metrics.tenantId
        }, 'High concurrent request activity detected');
    }

    // Override res.end to track completion
    const originalEnd = res.end.bind(res);
    res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;
        concurrentRequests--;

        // Remove from active requests
        activeRequests.delete(requestId);

        // Log performance metrics
        logger.info({
            requestId,
            endpoint: metrics.endpoint,
            tenantId: metrics.tenantId,
            responseTime,
            statusCode: res.statusCode,
            concurrentRequests,
            avgResponseTime: (totalResponseTime / totalRequests).toFixed(2) + 'ms'
        }, 'Request completed');

        // Call original end
        return originalEnd(...args);
    };

    next();
};

export const getPerformanceStats = () => {
    return {
        totalRequests,
        concurrentRequests,
        maxConcurrentRequests,
        avgResponseTime: totalRequests > 0 ? (totalResponseTime / totalRequests).toFixed(2) + 'ms' : '0ms',
        activeRequests: Array.from(activeRequests.entries()).map(([id, metrics]) => ({
            id,
            ...metrics,
            duration: Date.now() - metrics.startTime
        }))
    };
};

export const resetPerformanceStats = () => {
    totalRequests = 0;
    concurrentRequests = 0;
    maxConcurrentRequests = 0;
    totalResponseTime = 0;
    activeRequests.clear();
};
