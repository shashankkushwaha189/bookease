import { Request, Response, NextFunction } from 'express';

export const authorize = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Mock authorization - in production, this would check user permissions
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
        }
        
        // Simple permission check - in production, this would be more sophisticated
        const userPermissions = getUserPermissions(req.user.role);
        
        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
            });
        }
        
        next();
    };
};

function getUserPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
        'admin': [
            'services:create', 'services:update', 'services:delete', 'services:assign',
            'staff:create', 'staff:update', 'staff:delete', 'staff:assign', 'staff:schedule', 'staff:timeoff'
        ],
        'manager': [
            'services:create', 'services:update', 'services:assign',
            'staff:create', 'staff:update', 'staff:assign', 'staff:schedule', 'staff:timeoff'
        ],
        'staff': [
            'staff:update', 'staff:schedule', 'staff:timeoff'
        ]
    };
    
    return permissions[role] || [];
}
