"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_controller_1 = require("./config.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("../../generated/client");
const router = (0, express_1.Router)();
// All config routes are ADMIN only
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN));
router.get('/current', config_controller_1.configController.getCurrent);
router.get('/history', config_controller_1.configController.getHistory);
router.post('/', config_controller_1.configController.save);
router.post('/rollback/:version', config_controller_1.configController.rollback);
exports.default = router;
