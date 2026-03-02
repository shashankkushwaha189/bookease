"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const validate_1 = require("../../middleware/validate");
const auth_schema_1 = require("./auth.schema");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
const service = new auth_service_1.AuthService();
const controller = new auth_controller_1.AuthController(service);
// Security: Rate limit login attempts
const loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'test' ? 100 : 5, // Limit each IP to 5 login requests (100 in tests)
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts. Please try again after 15 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/login', loginRateLimiter, (0, validate_1.validateBody)(auth_schema_1.loginSchema), controller.login);
router.get('/me', auth_middleware_1.authMiddleware, controller.me);
router.post('/logout', auth_middleware_1.authMiddleware, controller.logout);
exports.default = router;
