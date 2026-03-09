"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.issues.map((err) => ({
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
exports.validateRequest = validateRequest;
