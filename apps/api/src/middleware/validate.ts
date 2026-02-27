import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware to validate request body against a Zod schema.
 * Replaces req.body with the validated (and typed) data.
 */
export const validateBody = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = await schema.parseAsync(req.body);
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid request body',
                        details: error.issues.map((err) => ({
                            path: err.path.join('.'),
                            message: err.message,
                        })),
                    },
                });
            }
            next(error);
        }
    };
};
