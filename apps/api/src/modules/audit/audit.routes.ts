import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, requireRole(UserRole.ADMIN), auditController.getLogs);

export default router;
