"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply tenant middleware first, then auth
router.use(tenant_middleware_1.tenantMiddleware);
router.use(auth_middleware_1.authMiddleware);
// Report endpoints (admin only)
router.get('/summary', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.summary);
router.get('/peak-times', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.peakTimes);
router.get('/staff-utilization', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.staffUtilization);
router.get('/export', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.exportData);
// Performance testing (admin only)
router.post('/test-performance', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.testPerformance);
// CSV validation (admin only)
router.post('/validate-csv', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), report_controller_1.reportController.validateCsv);
exports.default = router;
