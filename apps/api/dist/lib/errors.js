"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    message;
    status;
    code;
    details;
    constructor(message, status = 500, code = 'INTERNAL_SERVER_ERROR', details) {
        super(message);
        this.message = message;
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
