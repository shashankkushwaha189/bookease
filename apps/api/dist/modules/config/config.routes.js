"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_controller_1 = require("./config.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// All config routes are ADMIN only
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN));
// Core configuration endpoints
router.get('/current', config_controller_1.configController.getCurrent);
router.get('/history', config_controller_1.configController.getHistory);
router.post('/', config_controller_1.configController.save);
router.post('/rollback/:version', config_controller_1.configController.rollback);
// Feature flag endpoints
router.get('/features', config_controller_1.configController.getFeatures);
router.post('/features/enable', config_controller_1.configController.enableFeature);
router.post('/features/disable', config_controller_1.configController.disableFeature);
// Permission check endpoints
router.get('/permissions/:permission', config_controller_1.configController.checkPermission);
// Policy validation endpoints
router.post('/validate/booking-window', config_controller_1.configController.validateBookingWindow);
router.post('/validate/cancellation', config_controller_1.configController.validateCancellation);
router.post('/validate/business-hours', config_controller_1.configController.checkBusinessHours);
// Performance and monitoring endpoints
router.get('/metrics', config_controller_1.configController.getMetrics);
router.get('/health', config_controller_1.configController.healthCheck);
router.delete('/cache', config_controller_1.configController.clearCache);
exports.default = router;
