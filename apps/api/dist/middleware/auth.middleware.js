"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("@bookease/logger");
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'No token provided',
            },
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        // Ensure token tenantId matches req.tenant.id (from tenantMiddleware)
        if (decoded.tenantId !== req.tenantId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token tenant mismatch',
                },
            });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.sub },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not found or inactive',
                },
            });
        }
        // Double check tenant isolation at DB level
        if (user.tenantId !== decoded.tenantId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User tenant mismatch',
                },
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        logger_1.logger.warn({ err: error }, 'JWT verification failed');
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            },
        });
    }
};
exports.authMiddleware = authMiddleware;
