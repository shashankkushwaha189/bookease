import { Router } from 'express';
import { apiTokenController } from './api-token.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Tokens can only be generated explicitly by human admins logging into the dashboard
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.post('/', apiTokenController.create);
router.get('/', apiTokenController.list);
router.delete('/:id', apiTokenController.revoke);

export default router;
