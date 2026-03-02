"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineService = exports.TimelineService = void 0;
const prisma_1 = require("../../lib/prisma");
class TimelineService {
    /**
     * Records an appointment lifecycle event.
     * Records are immutable — no update or delete ever.
     */
    async addEvent(params) {
        console.log(`[TimelineService] Creating event for appt: ${params.appointmentId}, type: ${params.eventType}`);
        const result = await prisma_1.prisma.appointmentTimeline.create({
            data: {
                appointmentId: params.appointmentId,
                tenantId: params.tenantId,
                eventType: params.eventType,
                performedBy: params.performedBy || 'SYSTEM',
                note: params.note,
                metadata: params.metadata || {},
            },
        });
        console.log(`[TimelineService] Created event ID: ${result.id}`);
    }
    async getTimeline(appointmentId, tenantId) {
        console.log(`[TimelineService] Fetching timeline for appt: ${appointmentId}, tenant: ${tenantId}`);
        const results = await prisma_1.prisma.appointmentTimeline.findMany({
            where: {
                appointmentId,
                tenantId,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        console.log(`[TimelineService] Found ${results.length} events`);
        return results;
    }
}
exports.TimelineService = TimelineService;
exports.timelineService = new TimelineService();
