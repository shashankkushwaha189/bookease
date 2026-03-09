"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const session_controller_1 = require("./session.controller");
const validate_1 = require("../../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new session_controller_1.SessionController();
// Validation schemas
const createSessionSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    deviceId: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
});
const getSessionSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
const updateSessionSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
const deleteSessionSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
});
const getUserSessionsSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    limit: zod_1.z.string().transform(val => parseInt(val)).optional(),
});
const deleteAllSessionsSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
});
const getAnalyticsSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
});
// Session routes
router.post('/', (0, validate_1.validateBody)(createSessionSchema), controller.createSession);
router.get('/:token', (0, validate_1.validateBody)(getSessionSchema), controller.getSession);
router.get('/user/:userId', (0, validate_1.validateBody)(getUserSessionsSchema), controller.getUserSessions);
router.put('/:token', (0, validate_1.validateBody)(updateSessionSchema), controller.updateSession);
router.delete('/:token', (0, validate_1.validateBody)(deleteSessionSchema), controller.deleteSession);
router.delete('/user/:userId', (0, validate_1.validateBody)(deleteAllSessionsSchema), controller.deleteUserSessions);
router.get('/analytics/:userId', (0, validate_1.validateBody)(getAnalyticsSchema), controller.getSessionAnalytics);
router.post('/cleanup', controller.cleanExpiredSessions);
exports.default = router;
