import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Role hierarchy - higher roles can access lower roles
const roleHierarchy = {
    [UserRole.ADMIN]: 3,
    [UserRole.STAFF]: 2,
    [UserRole.USER]: 1,
};

export const requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
        }

        const userRole = req.user.role as UserRole;
        const userRoleLevel = roleHierarchy[userRole];
        
        // Check if user has any of the required roles or a higher role
        const hasRequiredRole = roles.some(requiredRole => {
            const requiredRoleLevel = roleHierarchy[requiredRole];
            return userRoleLevel >= requiredRoleLevel;
        });

        if (!hasRequiredRole) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions',
                },
            });
        }

        next();
    };
};
