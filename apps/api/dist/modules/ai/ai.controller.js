"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = exports.AiController = void 0;
const ai_service_1 = require("./ai.service");
const errors_1 = require("../../lib/errors");
class AiController {
    async generateSummary(req, res, next) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const summary = await ai_service_1.aiService.generateSummary(id, tenantId);
            res.status(200).json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            next(error);
        }
    }
    async acceptSummary(req, res, next) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            // For testing & tracking purposes we grab the staff ID generating the explicit override
            const userIdRaw = req.user?.id || 'SYSTEM';
            const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const result = await ai_service_1.aiService.acceptSummary(id, tenantId, userId);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    async discardSummary(req, res, next) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            const userId = req.user?.id || 'SYSTEM';
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const result = await ai_service_1.aiService.discardSummary(id, tenantId, userId);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AiController = AiController;
exports.aiController = new AiController();
