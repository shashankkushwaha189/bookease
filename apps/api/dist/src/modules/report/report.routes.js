"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("./report.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.requireRole)('ADMIN')); // ADMIN only
router.get('/summary', report_controller_1.reportController.summary);
router.get('/peak-times', report_controller_1.reportController.peakTimes);
router.get('/staff-utilization', report_controller_1.reportController.staffUtilization);
router.get('/export', report_controller_1.reportController.exportData);
exports.default = router;
