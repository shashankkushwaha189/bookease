import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { TenantRepository } from '../tenant/tenant.repository';
import { prisma } from '../../lib/prisma';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const repository = new UserRepository(prisma);
const tenantRepository = new TenantRepository();
const service = new UserService(repository, tenantRepository);
const controller = new UserController(service);

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantSlug: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'USER']),
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const updateUserRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['ADMIN', 'STAFF', 'USER']),
});

// Public routes (no authentication required)
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/refresh', validateBody(z.object({
  refreshToken: z.string('Refresh token is required'),
})), controller.refreshToken);

// Protected routes (authentication required)
router.get('/profile', authMiddleware, controller.getProfile);
router.put('/profile', authMiddleware, validateBody(updateProfileSchema), controller.updateProfile);
router.put('/password', authMiddleware, validateBody(updatePasswordSchema), controller.updatePassword);
router.post('/logout', authMiddleware, controller.logout);

// Admin routes (admin role required)
router.get('/', authMiddleware, requireRole('ADMIN'), controller.getUsers);
router.post('/', authMiddleware, requireRole('ADMIN'), validateBody(createUserSchema), controller.createUser);
router.put('/:userId/role', authMiddleware, requireRole('ADMIN'), validateBody(updateUserRoleSchema), controller.updateUserRole);
router.delete('/:userId', authMiddleware, requireRole('ADMIN'), controller.deleteUser);
router.get('/search', authMiddleware, requireRole('ADMIN', 'STAFF'), controller.searchUsers);

export default router;
