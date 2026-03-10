import { Router } from 'express';
import { serviceController } from './service.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

const router = Router();
const publicRouter = Router();

// Public routes (no auth/tenant required)
publicRouter.get('/', serviceController.list);

// Apply tenant middleware to all protected routes
router.use(tenantMiddleware);

// Protected routes (auth required)
router.get('/', authMiddleware, serviceController.list);

// ADMIN only routes for write operations
router.post('/', authMiddleware, requireRole('ADMIN'), serviceController.create);
router.patch('/:id', authMiddleware, requireRole('ADMIN'), serviceController.update);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), serviceController.delete);

export { router, publicRouter };
