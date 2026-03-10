import { Router } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
const publicRouter = Router();

// Public staff list for booking (no auth required)
publicRouter.get('/', staffController.list);

// Apply tenant middleware to all protected routes
router.use(tenantMiddleware);
router.use(authMiddleware);

// All other routes require ADMIN role
router.get('/', requireRole(UserRole.ADMIN), staffController.list);
router.get('/:id', requireRole(UserRole.ADMIN), staffController.getById);
router.post('/', requireRole(UserRole.ADMIN), staffController.create);
router.patch('/:id', requireRole(UserRole.ADMIN), staffController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), staffController.delete);
router.post('/:id/services', requireRole(UserRole.ADMIN), staffController.assignServices);
router.put('/:id/schedule', requireRole(UserRole.ADMIN), staffController.setSchedule);
router.post('/:id/time-off', requireRole(UserRole.ADMIN), staffController.addTimeOff);

export { router, publicRouter };
