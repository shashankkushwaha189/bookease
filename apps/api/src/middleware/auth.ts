import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    // Mock authentication - in production, this would validate JWT tokens
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
    }
    
    // Mock user data - in production, this would decode and validate the JWT
    req.user = {
        id: 'user-123',
        email: 'user@example.com',
        tenantId: 'tenant-123',
        role: 'admin',
        isActive: true,
    };
    
    next();
};

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                tenantId: string;
                role: string;
                isActive: boolean;
            };
        }
    }
}
