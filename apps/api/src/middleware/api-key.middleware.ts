import { Request, Response, NextFunction } from 'express';
import { apiTokenService } from '../modules/api-token/api-token.service';
import rateLimit from 'express-rate-limit';

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        // Fall back to next middleware if chaining, but for dedicated API routes we will reject.
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Missing X-API-Key header'
            }
        });
    }

    try {
        const tenantId = await apiTokenService.validateToken(apiKey);

        if (!tenantId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or revoked API Key'
                }
            });
        }

        // Attach tenant id globally
        req.tenantId = tenantId;

        // Let user role be 'SYSTEM_API' essentially bypassing staff/admin role checks cleanly if required downstream
        (req as any).user = { id: 'api-token', role: 'API' };

        next();
    } catch (error) {
        next(error);
    }
};

// 100 req per minute explicitly isolated strictly to the API token scope
export const apiKeyRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests
    keyGenerator: (req) => {
        return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'API Token rate limit exceeded. 100 requests per minute allowed.'
        }
    }
});
