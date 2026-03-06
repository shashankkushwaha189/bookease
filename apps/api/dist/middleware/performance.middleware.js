"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPerformanceStats = exports.getPerformanceStats = exports.performanceMiddleware = void 0;
const logger_1 = require("@bookease/logger");
// Store active requests for concurrent monitoring
const activeRequests = new Map();
// Performance metrics
let totalRequests = 0;
let concurrentRequests = 0;
let maxConcurrentRequests = 0;
let totalResponseTime = 0;
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    totalRequests++;
    concurrentRequests++;
    if (concurrentRequests > maxConcurrentRequests) {
        maxConcurrentRequests = concurrentRequests;
    }
    // Store request metrics
    const metrics = {
        startTime,
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        tenantId: req.tenantId
    };
    activeRequests.set(requestId, metrics);
    // Log concurrent request info
    if (concurrentRequests > 10) { // Log when we have high concurrency
        logger_1.logger.info({
            concurrentRequests,
            maxConcurrentRequests,
            endpoint: metrics.endpoint,
            tenantId: metrics.tenantId
        }, 'High concurrent request activity detected');
    }
    // Override res.end to track completion
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;
        totalResponseTime += responseTime;
        concurrentRequests--;
        // Remove from active requests
        activeRequests.delete(requestId);
        // Log performance metrics
        logger_1.logger.info({
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
exports.performanceMiddleware = performanceMiddleware;
const getPerformanceStats = () => {
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
exports.getPerformanceStats = getPerformanceStats;
const resetPerformanceStats = () => {
    totalRequests = 0;
    concurrentRequests = 0;
    maxConcurrentRequests = 0;
    totalResponseTime = 0;
    activeRequests.clear();
};
exports.resetPerformanceStats = resetPerformanceStats;
