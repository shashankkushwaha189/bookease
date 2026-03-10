import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

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
            userId: string;
            tenantId: string;
            role: string;
        };

        // Ensure token tenantId matches req.tenantId (from tenantMiddleware)
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
            where: { id: decoded.userId },
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
