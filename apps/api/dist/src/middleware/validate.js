"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
const zod_1 = require("zod");
/**
 * Middleware to validate request body against a Zod schema.
 * Replaces req.body with the validated (and typed) data.
 */
const validateBody = (schema) => {
    return async (req, res, next) => {
        try {
            const validatedData = await schema.parseAsync(req.body);
            req.body = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
exports.validateBody = validateBody;
