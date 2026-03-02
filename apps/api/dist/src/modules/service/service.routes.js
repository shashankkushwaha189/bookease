"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = require("./service.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Public routes (must be before authMiddleware if mounted on same router)
// But we mount this same router on two paths.
// Let's use a different approach: separate routers or check in controller.
router.get('/', (req, res, next) => {
    if (req.originalUrl.includes('/public/'))
        return service_controller_1.serviceController.list(req, res);
    (0, auth_middleware_1.authMiddleware)(req, res, next);
}, service_controller_1.serviceController.list);
// ADMIN only routes for write operations
router.post('/', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), service_controller_1.serviceController.create);
router.patch('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), service_controller_1.serviceController.update);
router.delete('/:id', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), service_controller_1.serviceController.delete);
exports.default = router;
