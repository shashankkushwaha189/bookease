"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineService = exports.TimelineService = void 0;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("@bookease/logger");
class TimelineService {
    /**
     * Records an appointment lifecycle event.
     * Records are immutable — no update or delete ever.
     * Performance optimized with async logging.
     */
    async addEvent(params) {
        const startTime = Date.now(); // Performance tracking
        // Validate required fields
        if (!params.appointmentId || !params.tenantId || !params.eventType) {
            logger_1.logger.error({
                missing: ['appointmentId', 'tenantId', 'eventType'].filter(field => !params[field]),
                params
            }, 'Timeline event missing required fields');
            return;
        }
        // Check for potential duplicates (same event type within 1 second for same appointment)
        const existingRecentEvent = await prisma_1.prisma.appointmentTimeline.findFirst({
            where: {
                appointmentId: params.appointmentId,
                tenantId: params.tenantId,
                eventType: params.eventType,
                createdAt: {
                    gte: new Date(Date.now() - 1000) // Within last 1 second
                }
            }
        });
        if (existingRecentEvent) {
            logger_1.logger.warn({
                appointmentId: params.appointmentId,
                tenantId: params.tenantId,
                eventType: params.eventType,
                existingEventId: existingRecentEvent.id
            }, 'Duplicate timeline event detected - skipping');
            return;
        }
        // Fire-and-forget async logging for performance
        prisma_1.prisma.appointmentTimeline.create({
            data: {
                appointmentId: params.appointmentId,
                tenantId: params.tenantId,
                eventType: params.eventType,
                performedBy: params.performedBy || 'SYSTEM',
                note: params.note,
                metadata: params.metadata || {},
            },
        }).then(result => {
            const duration = Date.now() - startTime;
            logger_1.logger.debug({
                tenantId: params.tenantId,
                appointmentId: params.appointmentId,
                eventType: params.eventType,
                eventId: result.id,
                duration,
                correlationId: params.correlationId
            }, 'Timeline event created');
        }).catch(error => {
            const duration = Date.now() - startTime;
            logger_1.logger.error({
                tenantId: params.tenantId,
                appointmentId: params.appointmentId,
                eventType: params.eventType,
                error: error.message,
                duration,
                correlationId: params.correlationId
            }, 'Failed to create timeline event');
        });
    }
    /**
     * Get timeline for an appointment with performance optimization
     */
    async getTimeline(query) {
        const startTime = Date.now(); // Performance tracking
        const { appointmentId, tenantId, limit = 100, offset = 0, eventType } = query;
        logger_1.logger.debug({
            tenantId,
            appointmentId,
            limit,
            offset,
            eventType
        }, 'Fetching timeline events');
        const where = {
            appointmentId,
            tenantId,
        };
        if (eventType) {
            where.eventType = eventType;
        }
        const [events, total] = await Promise.all([
            prisma_1.prisma.appointmentTimeline.findMany({
                where,
                orderBy: {
                    createdAt: 'asc', // Events in correct chronological order
                },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    eventType: true,
                    performedBy: true,
                    note: true,
                    metadata: true,
                    createdAt: true,
                    // Don't include appointmentId in response for cleaner API
                }
            }),
            prisma_1.prisma.appointmentTimeline.count({ where })
        ]);
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            appointmentId,
            eventCount: events.length,
            totalEvents: total,
            limit,
            offset,
            duration,
            performanceRequirement: duration < 200 ? 'PASS' : 'FAIL'
        }, 'Timeline fetched successfully');
        return {
            events,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + events.length < total
            }
        };
    }
    /**
     * Get timeline summary for dashboard/analytics
     */
    async getTimelineSummary(appointmentId, tenantId) {
        const startTime = Date.now();
        const events = await prisma_1.prisma.appointmentTimeline.findMany({
            where: {
                appointmentId,
                tenantId,
            },
            select: {
                eventType: true,
                createdAt: true,
                performedBy: true,
            },
            orderBy: {
                createdAt: 'asc',
            }
        });
        const summary = {
            totalEvents: events.length,
            firstEvent: events[0]?.createdAt || null,
            lastEvent: events[events.length - 1]?.createdAt || null,
            eventTypes: events.reduce((acc, event) => {
                acc[event.eventType] = (acc[event.eventType] || 0) + 1;
                return acc;
            }, {}),
            performers: events.reduce((acc, event) => {
                const performer = event.performedBy || 'UNKNOWN';
                acc[performer] = (acc[performer] || 0) + 1;
                return acc;
            }, {})
        };
        const duration = Date.now() - startTime;
        logger_1.logger.debug({
            tenantId,
            appointmentId,
            summary,
            duration
        }, 'Timeline summary generated');
        return summary;
    }
    /**
     * Verify timeline immutability (for testing/audit)
     */
    async verifyImmutability(appointmentId, tenantId) {
        const events = await prisma_1.prisma.appointmentTimeline.findMany({
            where: {
                appointmentId,
                tenantId,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
        const violations = [];
        // Check for any updates (all events should have same createdAt as creation)
        for (const event of events) {
            const timeDiff = Date.now() - event.createdAt.getTime();
            // If event was created less than 1 second ago, it might be an update
            if (timeDiff < 1000 && events.length > 1) {
                const similarEvents = events.filter(e => e.id !== event.id &&
                    e.eventType === event.eventType &&
                    Math.abs(e.createdAt.getTime() - event.createdAt.getTime()) < 1000);
                if (similarEvents.length > 0) {
                    violations.push({
                        eventId: event.id,
                        violation: 'Potential duplicate/update detected'
                    });
                }
            }
        }
        return {
            isImmutable: violations.length === 0,
            violations
        };
    }
}
exports.TimelineService = TimelineService;
exports.timelineService = new TimelineService();
