import { Router } from 'express';
import { configController } from './config.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// All config routes are ADMIN only
router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

router.get('/current', configController.getCurrent);
router.get('/history', configController.getHistory);
router.post('/', configController.save);
router.post('/rollback/:version', configController.rollback);

export default router;
