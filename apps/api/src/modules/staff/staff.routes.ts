import { Router } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Public staff list for booking
router.get('/public/', staffController.list);

// All other routes require ADMIN role
router.get('/', requireRole(UserRole.ADMIN), staffController.list);
router.get('/:id', requireRole(UserRole.ADMIN), staffController.getById);
router.post('/', requireRole(UserRole.ADMIN), staffController.create);
router.patch('/:id', requireRole(UserRole.ADMIN), staffController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), staffController.delete);

router.post('/:id/services', requireRole(UserRole.ADMIN), staffController.assignServices);
router.put('/:id/schedule', requireRole(UserRole.ADMIN), staffController.setSchedule);
router.post('/:id/time-off', requireRole(UserRole.ADMIN), staffController.addTimeOff);

export default router;
