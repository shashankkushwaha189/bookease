import { Request, Response } from 'express';
import { timelineService } from './timeline.service';

export class TimelineController {
    getTimeline = async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const timeline = await timelineService.getTimeline(id, tenantId);
            res.json(timeline);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const timelineController = new TimelineController();
