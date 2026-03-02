"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineController = exports.TimelineController = void 0;
const timeline_service_1 = require("./timeline.service");
class TimelineController {
    getTimeline = async (req, res) => {
        try {
            const id = req.params.id;
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const timeline = await timeline_service_1.timelineService.getTimeline(id, tenantId);
            res.json(timeline);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}
exports.TimelineController = TimelineController;
exports.timelineController = new TimelineController();
