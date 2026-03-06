"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyRouter = void 0;
const express_1 = require("express");
const policy_controller_1 = require("./policy.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
exports.policyRouter = (0, express_1.Router)();
// Apply tenant middleware to all routes
exports.policyRouter.use(tenant_middleware_1.tenantMiddleware);
// Public endpoint for policy preview (no auth required)
exports.policyRouter.get("/preview", policy_controller_1.policyController.getPolicyPreview);
// Admin-only endpoints
exports.policyRouter.get("/overrides", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), policy_controller_1.policyController.getPolicyOverrides);
exports.policyRouter.post("/validate-update", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), policy_controller_1.policyController.validatePolicyUpdate);
exports.policyRouter.post("/test", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), policy_controller_1.policyController.testPolicyEnforcement);
exports.policyRouter.delete("/overrides", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), policy_controller_1.policyController.clearPolicyOverrides);
exports.default = exports.policyRouter;
