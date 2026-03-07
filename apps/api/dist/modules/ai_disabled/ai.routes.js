"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// We require explicit authentication to trigger generation and state updates
router.use(auth_middleware_1.authMiddleware, tenant_middleware_1.tenantMiddleware);
// AI Configuration routes (ADMIN only)
router.get('/configuration', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.getConfiguration);
router.put('/configuration', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.updateConfiguration);
router.post('/test-configuration', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.testConfiguration);
// AI Summary routes
router.post('/summaries/:id', ai_controller_1.aiController.generateSummary);
router.get('/summaries/:id', ai_controller_1.aiController.getSummary);
router.put('/summaries/:id', ai_controller_1.aiController.updateSummary);
router.delete('/summaries/:id', ai_controller_1.aiController.deleteSummary);
// AI Summary acceptance/rejection routes
router.post('/summaries/:id/accept', ai_controller_1.aiController.acceptSummary);
router.post('/summaries/:id/discard', ai_controller_1.aiController.discardSummary);
// Batch operations (ADMIN only)
router.post('/summaries/batch', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.batchGenerateSummaries);
router.post('/summaries/cleanup', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.cleanupOldSummaries);
// Usage statistics (ADMIN only)
router.get('/stats', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.getUsageStats);
// Legacy routes for backward compatibility
router.post('/:id/ai-summary', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), // fallback since requireRole expects string
ai_controller_1.aiController.generateSummary);
router.post('/:id/ai-summary/accept', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.acceptSummary);
router.post('/:id/ai-summary/discard', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), ai_controller_1.aiController.discardSummary);
exports.aiRoutes = router;
