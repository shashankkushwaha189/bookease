"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const authenticate = (req, res, next) => {
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
exports.authenticate = authenticate;
