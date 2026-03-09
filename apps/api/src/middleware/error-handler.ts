import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';

    // Simple console logging for now
    console.error({
        error: {
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            code,
            status,
            correlationId: (req as any).correlationId
        }
    });

    // Handle file upload errors
    if (err.name === 'MulterError' && err.message === 'File too large') {
        return res.status(413).json({
            success: false,
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: 'File size exceeds the 5MB limit.'
            }
        });
    }

    const response = {
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    };

    res.status(status).json(response);
};
