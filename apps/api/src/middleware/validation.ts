import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodObject<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.issues.map((err: any) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                    code: 'VALIDATION_ERROR',
                });
            }
            
            return res.status(400).json({
                success: false,
                error: 'Invalid request data',
                code: 'INVALID_REQUEST',
            });
        }
    };
};
