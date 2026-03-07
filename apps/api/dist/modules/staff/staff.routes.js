"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_controller_1 = require("./staff.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Public staff list for booking
router.get('/public/', staff_controller_1.staffController.list);
// All other routes require ADMIN role
router.get('/', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.list);
router.get('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.getById);
router.post('/', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.create);
router.patch('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.update);
router.delete('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.delete);
router.post('/:id/services', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.assignServices);
router.put('/:id/schedule', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.setSchedule);
router.post('/:id/time-off', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), staff_controller_1.staffController.addTimeOff);
exports.default = router;
