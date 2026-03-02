import { TimelineEvent } from '../../generated/client';
import { prisma } from '../../lib/prisma';

export class TimelineService {
    /**
     * Records an appointment lifecycle event.
     * Records are immutable — no update or delete ever.
     */
    async addEvent(params: {
        appointmentId: string;
        tenantId: string;
        eventType: TimelineEvent;
        performedBy?: string;
        note?: string;
        metadata?: any;
    }): Promise<void> {
        console.log(`[TimelineService] Creating event for appt: ${params.appointmentId}, type: ${params.eventType}`);
        const result = await prisma.appointmentTimeline.create({
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

    async getTimeline(appointmentId: string, tenantId: string) {
        console.log(`[TimelineService] Fetching timeline for appt: ${appointmentId}, tenant: ${tenantId}`);
        const results = await prisma.appointmentTimeline.findMany({
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

export const timelineService = new TimelineService();
