import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AppError } from '../../lib/errors';

export class AuthController {
    constructor(private service: AuthService) { }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.header('X-Tenant-ID');
            if (!tenantId) {
                return next(new AppError('X-Tenant-ID header is missing', 400, 'TENANT_ID_REQUIRED'));
            }
            const result = await this.service.login(tenantId, req.body);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.header('X-Tenant-ID');
            if (!tenantId) {
                return next(new AppError('X-Tenant-ID header is missing', 400, 'TENANT_ID_REQUIRED'));
            }
            const result = await this.service.register(tenantId, req.body);
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    me = async (req: Request, res: Response) => {
        // req.user is attached by authMiddleware
        res.json({
            success: true,
            data: {
                id: req.user?.id,
                email: req.user?.email,
                firstName: req.user?.firstName,
                lastName: req.user?.lastName,
                role: req.user?.role,
            },
        });
    };

    logout = async (req: Request, res: Response) => {
        // Placeholder for logout logic (e.g. token blocklisting in Redis)
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    };
}
