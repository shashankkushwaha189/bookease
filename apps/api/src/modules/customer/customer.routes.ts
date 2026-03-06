import { Router } from 'express';
import { customerController } from '../customer/customer.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply tenant middleware to all routes
router.use(authMiddleware);

// Public customer list route (no auth required, but tenant middleware applied)
router.get('/', customerController.list);

// Authenticated routes below this
router.use(requireRole(UserRole.ADMIN));

// Admin only customer management routes
router.get('/:id', requireRole(UserRole.ADMIN), customerController.getById);
router.post('/', requireRole(UserRole.ADMIN), customerController.create);
router.patch('/:id', requireRole(UserRole.ADMIN), customerController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), customerController.delete);

export default router;
