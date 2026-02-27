import { Request, Response, NextFunction } from 'express';
import { BusinessProfileService } from './business-profile.service';

export class BusinessProfileController {
    constructor(private service: BusinessProfileService) { }

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.getProfile(req.tenantId!);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    upsertProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.upsertProfile(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.getPublicProfile(req.tenantId!);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };
}
