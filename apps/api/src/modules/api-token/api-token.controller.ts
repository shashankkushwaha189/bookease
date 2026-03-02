import { Request, Response, NextFunction } from 'express';
import { apiTokenService } from './api-token.service';
import { AppError } from '../../lib/errors';

export class ApiTokenController {

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const { name } = req.body;

            if (!name) {
                throw new AppError('Token name is required', 400, 'MISSING_NAME');
            }

            const tokenData = await apiTokenService.createToken(tenantId, name);
            return res.status(201).json({ success: true, data: tokenData });
        } catch (error) {
            next(error);
        }
    };

    list = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const tokens = await apiTokenService.listTokens(tenantId);
            return res.status(200).json({ success: true, data: tokens });
        } catch (error) {
            next(error);
        }
    };

    revoke = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const tokenId = req.params.id as string;

            if (!tokenId) {
                throw new AppError('Token ID is required', 400, 'MISSING_ID');
            }

            const result = await apiTokenService.revokeToken(tenantId, tokenId);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}

export const apiTokenController = new ApiTokenController();
