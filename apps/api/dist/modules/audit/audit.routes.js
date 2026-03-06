"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Get audit logs with filtering (admin only)
router.get('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), audit_controller_1.auditController.getLogs);
// Get AI usage analytics (admin only)
router.get('/ai-analytics', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), audit_controller_1.auditController.getAiUsageAnalytics);
// Get correlation trail for specific request (admin only)
router.get('/correlation/:correlationId', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), audit_controller_1.auditController.getCorrelationTrail);
// Test audit logging performance (admin only)
router.post('/test-performance', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), audit_controller_1.auditController.testLoggingPerformance);
// Create test audit event (admin only)
router.post('/test-event', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), audit_controller_1.auditController.createTestEvent);
exports.default = router;
