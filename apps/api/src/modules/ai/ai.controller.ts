import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { AppError } from '../../lib/errors';

export class AiController {
    async generateSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId as string;

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const summary = await aiService.generateSummary(id, tenantId);

            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }

    async acceptSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId as string;
            // For testing & tracking purposes we grab the staff ID generating the explicit override
            const userIdRaw = req.user?.id || 'SYSTEM';
            const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const result = await aiService.acceptSummary(id, tenantId, userId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async discardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId as string;
            const userId = req.user?.id || 'SYSTEM';

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const result = await aiService.discardSummary(id, tenantId, userId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

export const aiController = new AiController();
