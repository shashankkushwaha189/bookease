"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const errors_1 = require("../../lib/errors");
class AuthController {
    service;
    constructor(service) {
        this.service = service;
    }
    login = async (req, res, next) => {
        try {
            const tenantId = req.header('X-Tenant-ID');
            if (!tenantId) {
                return next(new errors_1.AppError('X-Tenant-ID header is missing', 400, 'TENANT_ID_REQUIRED'));
            }
            const result = await this.service.login(tenantId, req.body);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    me = async (req, res) => {
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
    logout = async (req, res) => {
        // Placeholder for logout logic (e.g. token blocklisting in Redis)
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    };
}
exports.AuthController = AuthController;
