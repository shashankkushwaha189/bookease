import { Router } from 'express';
import { customerController } from '../customer/customer.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Public customer list route (no auth required, but tenant middleware applied via app.ts)
router.get('/', customerController.list);

// Authenticated routes below this
router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

// Admin only customer management routes
router.get('/:id', customerController.getById);
router.post('/', customerController.create);
router.patch('/:id', customerController.update);
router.delete('/:id', customerController.delete);

export default router;
