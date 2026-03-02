"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("../../generated/client");
const router = (0, express_1.Router)();
// We require explicit authentication to trigger generation and state updates
router.use(auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware);
router.post('/:id/ai-summary', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), // fallback since requireRole expects string
ai_controller_1.aiController.generateSummary);
router.post('/:id/ai-summary/accept', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.acceptSummary);
router.post('/:id/ai-summary/discard', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.discardSummary);
exports.aiRoutes = router;
