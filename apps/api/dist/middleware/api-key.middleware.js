"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRateLimiter = exports.apiKeyMiddleware = void 0;
const api_token_service_1 = require("../modules/api-token/api-token.service");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
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
        const validation = await api_token_service_1.apiTokenService.validateToken(apiKey);
        const tenantId = validation.tenantId || '';
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
        req.user = { id: 'api-token', role: 'API' };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.apiKeyMiddleware = apiKeyMiddleware;
// 100 req per minute explicitly isolated strictly to the API token scope
exports.apiKeyRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests
    keyGenerator: (req) => {
        return req.headers['x-api-key'] || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'API Token rate limit exceeded. 100 requests per minute allowed.'
        }
    }
});
