import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
    constructor(private service: AuthService) { }

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.service.login(req.tenantId!, req.body);
            res.json({
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
