import { Request, Response, NextFunction } from 'express';
import { logger } from '@bookease/logger';
import { ApiResponse } from '@bookease/types';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';

    // Log error with correlation ID (handled by pino mixin)
    logger.error({
        err: {
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            code,
        },
        status,
        path: req.path,
        method: req.method,
    });

    const response: ApiResponse = {
        success: false,
        error: {
            code,
            message,
            details: process.env.NODE_ENV === 'development' ? err.details : undefined,
        },
    };

    if (err.name === 'MulterError' && err.message === 'File too large') {
        return res.status(413).json({
            success: false,
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: 'File size exceeds the 5MB limit.'
            }
        });
    }

    res.status(status).json(response);
};
