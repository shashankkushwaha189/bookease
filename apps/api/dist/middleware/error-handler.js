"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("@bookease/logger");
const errorHandler = (err, req, res, next) => {
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';
    // Log error with correlation ID (handled by pino mixin)
    logger_1.logger.error({
        err: {
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            code,
        },
        status,
        path: req.path,
        method: req.method,
    });
    const response = {
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
exports.errorHandler = errorHandler;
