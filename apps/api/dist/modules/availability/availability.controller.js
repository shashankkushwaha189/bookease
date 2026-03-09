"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityController = exports.AvailabilityController = void 0;
const availability_service_1 = require("./availability.service");
const logger_1 = require("@bookease/logger");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const availabilityQuerySchema = zod_1.z.object({
    serviceId: zod_1.z.string().uuid(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    staffId: zod_1.z.string().uuid().optional(),
});
const cache = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds
// Performance metrics
let totalQueries = 0;
let cacheHits = 0;
let cacheMisses = 0;
let totalQueryTime = 0;
class AvailabilityController {
    async getAvailability(req, res) {
        const startTime = Date.now();
        totalQueries++;
        try {
            const validated = availabilityQuerySchema.safeParse(req.query);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid query parameters',
                        details: validated.error.format(),
                    },
                });
            }
            const { serviceId, date, staffId } = validated.data;
            // For public requests, use default tenant if no tenant ID provided
            const tenantId = req.tenantId || "b18e0808-27d1-4253-aca9-453897585106";
            // Fetch tenant to get the correct business timezone
            const tenant = await prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { timezone: true }
            });
            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Tenant not found' }
                });
            }
            const businessTimezone = tenant.timezone;
            const cacheKey = `${tenantId}:${serviceId}:${staffId || 'any'}:${date}`;
            // Check cache (skip in test environment)
            let cached = null;
            if (process.env.NODE_ENV !== 'test') {
                cached = cache.get(cacheKey) || null;
            }
            if (cached && cached.expires > Date.now()) {
                cacheHits++;
                cached.hitCount++;
                const queryTime = Date.now() - startTime;
                totalQueryTime += queryTime;
                // Log cache hit performance
                logger_1.logger.info({
                    tenantId,
                    serviceId,
                    date,
                    queryTime,
                    cached: true,
                    hitCount: cached.hitCount,
                    cacheHitRate: ((cacheHits / totalQueries) * 100).toFixed(2) + '%'
                }, 'Availability cache hit');
                return res.json({
                    success: true,
                    data: {
                        slots: cached.data,
                        date,
                        serviceId,
                        timezone: businessTimezone,
                        cached: true,
                        performance: {
                            queryTime,
                            cacheHitRate: ((cacheHits / totalQueries) * 100).toFixed(2) + '%'
                        }
                    }
                });
            }
            cacheMisses++;
            // Generate availability with fallback handling
            let slots;
            try {
                slots = await availability_service_1.availabilityService.generateSlots({
                    tenantId,
                    serviceId,
                    staffId,
                    date,
                    businessTimezone
                });
            }
            catch (generationError) {
                logger_1.logger.error({
                    err: generationError,
                    tenantId,
                    serviceId,
                    date
                }, 'Availability generation failed, attempting fallback');
                // Fallback to basic availability
                slots = await this.generateBasicAvailability({
                    tenantId,
                    serviceId,
                    staffId,
                    date,
                    businessTimezone
                });
            }
            // Store in cache if not in test env
            if (process.env.NODE_ENV !== 'test') {
                cache.set(cacheKey, {
                    data: slots,
                    expires: Date.now() + CACHE_TTL_MS,
                    createdAt: Date.now(),
                    hitCount: 1
                });
            }
            const queryTime = Date.now() - startTime;
            totalQueryTime += queryTime;
            // Log performance metrics
            logger_1.logger.info({
                tenantId,
                serviceId,
                date,
                queryTime,
                cached: false,
                slotCount: slots.length,
                avgQueryTime: (totalQueryTime / totalQueries).toFixed(2) + 'ms',
                cacheHitRate: ((cacheHits / totalQueries) * 100).toFixed(2) + '%'
            }, 'Availability query completed');
            res.json({
                success: true,
                data: {
                    slots,
                    date,
                    serviceId,
                    timezone: businessTimezone,
                    cached: false,
                    performance: {
                        queryTime,
                        avgQueryTime: (totalQueryTime / totalQueries).toFixed(2) + 'ms',
                        cacheHitRate: ((cacheHits / totalQueries) * 100).toFixed(2) + '%'
                    }
                }
            });
        }
        catch (error) {
            const queryTime = Date.now() - startTime;
            totalQueryTime += queryTime;
            logger_1.logger.error({
                err: error,
                tenantId: req.tenantId,
                queryTime
            }, 'Error getting availability');
            // Graceful degradation
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch availability. Please try again later.'
                },
                performance: {
                    queryTime,
                    avgQueryTime: (totalQueryTime / totalQueries).toFixed(2) + 'ms',
                    cacheHitRate: ((cacheHits / totalQueries) * 100).toFixed(2) + '%'
                }
            });
        }
    }
    // Basic fallback availability generation
    async generateBasicAvailability(input) {
        const { tenantId, serviceId, staffId, date, businessTimezone } = input;
        // Get basic service info
        const service = await prisma_1.prisma.service.findFirst({
            where: { id: serviceId, tenantId, isActive: true },
            select: { durationMinutes: true, bufferBefore: true, bufferAfter: true }
        });
        if (!service) {
            throw new Error('Service not found');
        }
        // Get basic staff info
        const staffList = await prisma_1.prisma.staff.findMany({
            where: {
                tenantId,
                isActive: true,
                ...(staffId && { id: staffId })
            },
            include: {
                weeklySchedule: {
                    where: { isWorking: true },
                    include: { breaks: true }
                },
                timeOffs: {
                    where: {
                        date: { lte: new Date(date + 'T23:59:59.999Z') },
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date(date + 'T00:00:00.000Z') } }
                        ]
                    }
                }
            }
        });
        // Generate very basic slots (9 AM - 5 PM, 1-hour intervals)
        const basicSlots = [];
        const dayOfWeek = new Date(date).getDay();
        for (const staff of staffList) {
            // Skip if has time off
            if (staff.timeOffs.length > 0)
                continue;
            const schedule = staff.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
            if (!schedule)
                continue;
            // Generate simple hourly slots
            for (let hour = 9; hour < 17; hour++) {
                const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
                const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60000);
                basicSlots.push({
                    staffId: staff.id,
                    staffName: staff.name,
                    startTimeUtc: slotStart.toISOString(),
                    endTimeUtc: slotEnd.toISOString(),
                    startTimeLocal: hour.toString().padStart(2, '0') + ':00',
                    endTimeLocal: new Date(slotEnd.getTime()).getHours().toString().padStart(2, '0') + ':' +
                        new Date(slotEnd.getTime()).getMinutes().toString().padStart(2, '0')
                });
            }
        }
        return basicSlots;
    }
    // Enhanced cache invalidation with metrics
    invalidateCache(tenantId) {
        let invalidatedCount = 0;
        for (const [key, entry] of cache.entries()) {
            if (key.startsWith(`${tenantId}:`)) {
                cache.delete(key);
                invalidatedCount++;
            }
        }
        logger_1.logger.info({
            tenantId,
            invalidatedCount,
            remainingCacheSize: cache.size
        }, 'Cache invalidation completed');
        return invalidatedCount;
    }
    // Get cache statistics for monitoring
    getCacheStats() {
        return {
            totalQueries,
            cacheHits,
            cacheMisses,
            cacheHitRate: totalQueries > 0 ? ((cacheHits / totalQueries) * 100).toFixed(2) + '%' : '0%',
            avgQueryTime: totalQueries > 0 ? (totalQueryTime / totalQueries).toFixed(2) + 'ms' : '0ms',
            cacheSize: cache.size,
            cacheEntries: Array.from(cache.entries()).map(([key, entry]) => ({
                key,
                hitCount: entry.hitCount,
                age: Date.now() - entry.createdAt,
                ttl: entry.expires - Date.now()
            }))
        };
    }
    // Clear old cache entries
    cleanupCache() {
        let cleanedCount = 0;
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
            if (entry.expires <= now) {
                cache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.info({
                cleanedCount,
                remainingCacheSize: cache.size
            }, 'Cache cleanup completed');
        }
        return cleanedCount;
    }
}
exports.AvailabilityController = AvailabilityController;
exports.availabilityController = new AvailabilityController();
// Periodic cache cleanup (every 5 minutes)
setInterval(() => {
    exports.availabilityController.cleanupCache();
}, 5 * 60 * 1000);
