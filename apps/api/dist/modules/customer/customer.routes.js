"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../customer/customer.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply tenant middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Public customer list route (no auth required, but tenant middleware applied)
router.get('/', customer_controller_1.customerController.list);
// Authenticated routes below this
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN));
// Admin only customer management routes
router.get('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), customer_controller_1.customerController.getById);
router.post('/', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), customer_controller_1.customerController.create);
router.patch('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), customer_controller_1.customerController.update);
router.delete('/:id', (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), customer_controller_1.customerController.delete);
exports.default = router;
