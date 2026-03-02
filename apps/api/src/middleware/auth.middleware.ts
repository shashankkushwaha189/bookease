import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '@bookease/logger';
import { User } from '../generated/client';

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
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
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            sub: string;
            tenantId: string;
            role: string;
        };

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

        const user = await prisma.user.findUnique({
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

        req.user = user as User;
        next();
    } catch (error) {
        logger.warn({ err: error }, 'JWT verification failed');
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            },
        });
    }
};
