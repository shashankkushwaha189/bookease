import { Router } from 'express';
import { aiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '../../generated/client';

const router = Router();

// We require explicit authentication to trigger generation and state updates
router.use(authMiddleware, tenantMiddleware);

router.post(
    '/:id/ai-summary',
    requireRole(UserRole.ADMIN), // fallback since requireRole expects string
    aiController.generateSummary
);

router.post(
    '/:id/ai-summary/accept',
    requireRole(UserRole.ADMIN),
    aiController.acceptSummary
);

router.post(
    '/:id/ai-summary/discard',
    requireRole(UserRole.ADMIN),
    aiController.discardSummary
);

export const aiRoutes = router;
