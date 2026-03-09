"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const availability_engine_1 = require("./availability.engine");
const availability_schema_1 = require("./availability.schema");
const prisma_1 = require("../../lib/prisma");
class AvailabilityService {
    engine;
    cache = new Map();
    metrics = {
        totalRequests: 0,
        cacheHits: 0,
        averageResponseTime: 0,
        concurrentRequests: 0,
        errors: 0,
        lastReset: new Date().toISOString(),
    };
    constructor() {
        this.engine = new availability_engine_1.AvailabilityEngine();
    }
    // Main availability calculation method
    async getAvailability(request) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        this.metrics.concurrentRequests++;
        try {
            // Validate request
            const validated = availability_schema_1.availabilityRequestSchema.parse(request);
            // Check cache first
            const cacheKey = this.generateCacheKey(validated);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }
            // Get all required data
            const [staff, service, schedule, timeOffs, dateOverrides, appointments] = await Promise.all([
                this.getStaff(validated.staffId),
                this.getService(validated.serviceId),
                this.getStaffSchedule(validated.staffId, validated.date),
                this.getStaffTimeOffs(validated.staffId, validated.date),
                this.getDateOverrides(validated.staffId, validated.date),
                this.getStaffAppointments(validated.staffId, validated.date),
            ]);
            // Use engine to calculate availability
            const response = await this.engine.calculateAvailability({
                ...validated,
                staff,
                service,
                schedule,
                timeOffs,
                dateOverrides,
                appointments,
            });
            // Cache the result
            this.setCache(cacheKey, response);
            // Update metrics
            const responseTime = Date.now() - startTime;
            this.updateMetrics(responseTime);
            return response;
        }
        catch (error) {
            this.metrics.errors++;
            throw error;
        }
        finally {
            this.metrics.concurrentRequests--;
        }
    }
    // Get available time slots for multiple staff
    async getMultiStaffAvailability(requests) {
        const startTime = Date.now();
        this.metrics.totalRequests += requests.length;
        this.metrics.concurrentRequests += requests.length;
        try {
            // Process requests in parallel for better performance
            const responses = await Promise.all(requests.map(request => this.getAvailability(request)));
            // Update metrics
            const responseTime = Date.now() - startTime;
            this.updateMetrics(responseTime / requests.length);
            return responses;
        }
        catch (error) {
            this.metrics.errors++;
            throw error;
        }
        finally {
            this.metrics.concurrentRequests -= requests.length;
        }
    }
    // Health check
    async healthCheck() {
        const metrics = this.getMetrics();
        const cacheSize = this.cache.size;
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metrics,
            cache: {
                size: cacheSize,
                hitRate: metrics.cacheHitRate,
            },
            performance: {
                averageResponseTime: metrics.averageResponseTime,
                totalRequests: metrics.totalRequests,
                errorRate: metrics.errorRate,
            },
        };
    }
    // Get performance metrics
    getMetrics() {
        return {
            totalRequests: this.metrics.totalRequests,
            cacheHits: this.metrics.cacheHits,
            cacheHitRate: this.metrics.totalRequests > 0
                ? this.metrics.cacheHits / this.metrics.totalRequests
                : 0,
            averageResponseTime: this.metrics.totalRequests > 0
                ? this.metrics.averageResponseTime / this.metrics.totalRequests
                : 0,
            concurrentRequests: this.metrics.concurrentRequests,
            errorRate: this.metrics.totalRequests > 0
                ? this.metrics.errors / this.metrics.totalRequests
                : 0,
            lastReset: this.metrics.lastReset,
        };
    }
    // Private helper methods
    generateCacheKey(request) {
        const key = `${request.staffId}-${request.serviceId}-${request.date}-${request.timezone}-${request.duration}-${request.bufferBefore || 0}-${request.bufferAfter || 0}-${request.includeBufferInSlot}`;
        return Buffer.from(key).toString('base64');
    }
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > new Date()) {
            return cached.data;
        }
        return null;
    }
    setCache(key, data) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        this.cache.set(key, {
            data,
            expiresAt,
        });
    }
    updateMetrics(responseTime) {
        this.metrics.averageResponseTime += responseTime;
    }
    // Database helper methods
    async getStaff(staffId) {
        return prisma_1.prisma.staff.findUnique({
            where: { id: staffId },
            include: {
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: true,
            },
        });
    }
    async getService(serviceId) {
        return prisma_1.prisma.service.findUnique({
            where: { id: serviceId },
        });
    }
    async getStaffSchedule(staffId, date) {
        const dayOfWeek = new Date(date).getDay();
        return prisma_1.prisma.weeklySchedule.findFirst({
            where: {
                staffId,
                dayOfWeek,
            },
            include: {
                breaks: true,
            },
        });
    }
    async getStaffTimeOffs(staffId, date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        return prisma_1.prisma.staffTimeOff.findMany({
            where: {
                staffId,
                OR: [
                    {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    {
                        endDate: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                ],
            },
            orderBy: { date: 'asc' },
        });
    }
    async getDateOverrides(staffId, date) {
        return prisma_1.prisma.dateOverride.findMany({
            where: {
                staffId,
                date: new Date(date),
            },
            orderBy: { date: 'asc' },
        });
    }
    async getStaffAppointments(staffId, date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        return prisma_1.prisma.appointment.findMany({
            where: {
                staffId,
                startTimeUtc: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    in: ['BOOKED', 'CONFIRMED'],
                },
            },
            orderBy: { startTimeUtc: 'asc' },
        });
    }
}
exports.AvailabilityService = AvailabilityService;
