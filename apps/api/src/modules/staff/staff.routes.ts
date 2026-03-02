import { Router } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '../../generated/client';

const router = Router();

// Public & Authenticated list route
router.get('/', (req, res, next) => {
    if (req.originalUrl.includes('/public/')) return staffController.list(req, res);
    authMiddleware(req, res, next);
}, staffController.list);

// Authenticated routes below this
router.use(authMiddleware);

// ADMIN only
router.get('/:id', requireRole(UserRole.ADMIN), staffController.getById);
router.post('/', requireRole(UserRole.ADMIN), staffController.create);
router.patch('/:id', requireRole(UserRole.ADMIN), staffController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), staffController.delete);

router.post('/:id/services', requireRole(UserRole.ADMIN), staffController.assignServices);
router.put('/:id/schedule', requireRole(UserRole.ADMIN), staffController.setSchedule);
router.post('/:id/time-off', requireRole(UserRole.ADMIN), staffController.addTimeOff);

export default router;
