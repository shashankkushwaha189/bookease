import { Router } from 'express';
import { serviceController } from './service.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes (must be before authMiddleware if mounted on same router)
// But we mount this same router on two paths.
// Let's use a different approach: separate routers or check in controller.

router.get('/', (req, res, next) => {
    if (req.originalUrl.includes('/public/')) return serviceController.list(req, res);
    authMiddleware(req, res, next);
}, serviceController.list);

// ADMIN only routes for write operations
router.post('/', authMiddleware, requireRole(UserRole.ADMIN), serviceController.create);
router.patch('/:id', authMiddleware, requireRole(UserRole.ADMIN), serviceController.update);
router.delete('/:id', authMiddleware, requireRole(UserRole.ADMIN), serviceController.delete);

export default router;
