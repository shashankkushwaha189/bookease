"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const user_service_1 = require("./user.service");
const user_repository_1 = require("./user.repository");
const tenant_repository_1 = require("../tenant/tenant.repository");
const prisma_1 = require("../../lib/prisma");
const validate_1 = require("../../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const repository = new user_repository_1.UserRepository(prisma_1.prisma);
const tenantRepository = new tenant_repository_1.TenantRepository();
const service = new user_service_1.UserService(repository, tenantRepository);
const controller = new user_controller_1.UserController(service);
// Validation schemas
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    tenantSlug: zod_1.z.string().optional(),
});
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'USER']),
});
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: zod_1.z.string().email('Invalid email format').optional(),
});
const updatePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6, 'Current password is required'),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
const updateUserRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'USER']),
});
// Public routes (no authentication required)
router.post('/login', (0, validate_1.validateBody)(loginSchema), controller.login);
router.post('/refresh', (0, validate_1.validateBody)(zod_1.z.object({
    refreshToken: zod_1.z.string('Refresh token is required'),
})), controller.refreshToken);
// Protected routes (authentication required)
router.get('/profile', controller.getProfile);
router.put('/profile', (0, validate_1.validateBody)(updateProfileSchema), controller.updateProfile);
router.put('/password', (0, validate_1.validateBody)(updatePasswordSchema), controller.updatePassword);
router.post('/logout', controller.logout);
// Admin routes (admin role required)
router.get('/users', controller.getUsers);
router.post('/users', (0, validate_1.validateBody)(createUserSchema), controller.createUser);
router.put('/users/:userId/role', (0, validate_1.validateBody)(updateUserRoleSchema), controller.updateUserRole);
router.delete('/users/:userId', controller.deleteUser);
router.get('/search', controller.searchUsers);
exports.default = router;
