"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetBookingConcurrencyStats = exports.getBookingConcurrencyStats = exports.bookingRateLimiter = exports.bookingConcurrencyMiddleware = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("@bookease/logger");
// Store active booking attempts for concurrent request monitoring
const activeBookingAttempts = new Map();
// Performance metrics
let totalBookingAttempts = 0;
let concurrentBookingAttempts = 0;
let maxConcurrentBookingAttempts = 0;
let successfulBookings = 0;
let failedBookings = 0;
const bookingConcurrencyMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const attemptId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = req.tenantId || 'unknown';
    totalBookingAttempts++;
    concurrentBookingAttempts++;
    if (concurrentBookingAttempts > maxConcurrentBookingAttempts) {
        maxConcurrentBookingAttempts = concurrentBookingAttempts;
    }
    // Store booking attempt
    activeBookingAttempts.set(attemptId, {
        startTime,
        tenantId
    });
    // Log high concurrency
    if (concurrentBookingAttempts > 50) {
        logger_1.logger.warn({
            concurrentBookingAttempts,
            maxConcurrentBookingAttempts,
            tenantId,
            endpoint: req.path
        }, 'High concurrent booking attempts detected');
    }
    // Override res.end to track completion
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;
        concurrentBookingAttempts--;
        activeBookingAttempts.delete(attemptId);
        // Track success/failure
        if (res.statusCode >= 200 && res.statusCode < 300) {
            successfulBookings++;
        }
        else {
            failedBookings++;
        }
        // Log performance
        logger_1.logger.info({
            attemptId,
            tenantId,
            responseTime,
            statusCode: res.statusCode,
            concurrentBookingAttempts,
            successRate: totalBookingAttempts > 0 ? ((successfulBookings / totalBookingAttempts) * 100).toFixed(2) + '%' : '0%'
        }, 'Booking attempt completed');
        return originalEnd(...args);
    };
    next();
};
exports.bookingConcurrencyMiddleware = bookingConcurrencyMiddleware;
// Rate limiting for booking endpoints (handle 100+ concurrent requests)
exports.bookingRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 booking attempts per window
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many booking attempts. Please try again later.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});
const getBookingConcurrencyStats = () => {
    return {
        totalBookingAttempts,
        concurrentBookingAttempts,
        maxConcurrentBookingAttempts,
        successfulBookings,
        failedBookings,
        successRate: totalBookingAttempts > 0 ? ((successfulBookings / totalBookingAttempts) * 100).toFixed(2) + '%' : '0%',
        activeAttempts: Array.from(activeBookingAttempts.entries()).map(([id, attempt]) => ({
            id,
            ...attempt,
            duration: Date.now() - attempt.startTime
        }))
    };
};
exports.getBookingConcurrencyStats = getBookingConcurrencyStats;
const resetBookingConcurrencyStats = () => {
    totalBookingAttempts = 0;
    concurrentBookingAttempts = 0;
    maxConcurrentBookingAttempts = 0;
    successfulBookings = 0;
    failedBookings = 0;
    activeBookingAttempts.clear();
};
exports.resetBookingConcurrencyStats = resetBookingConcurrencyStats;
