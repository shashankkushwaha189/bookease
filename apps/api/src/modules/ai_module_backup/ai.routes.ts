import { Router } from 'express';
import { aiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// We require explicit authentication to trigger generation and state updates
router.use(authMiddleware, tenantMiddleware);

// AI Configuration routes (ADMIN only)
router.get('/configuration', requireRole(UserRole.ADMIN), aiController.getConfiguration);
router.put('/configuration', requireRole(UserRole.ADMIN), aiController.updateConfiguration);
router.post('/test-configuration', requireRole(UserRole.ADMIN), aiController.testConfiguration);

// AI Summary routes
router.post('/summaries/:id', aiController.generateSummary);
router.get('/summaries/:id', aiController.getSummary);
router.put('/summaries/:id', aiController.updateSummary);
router.delete('/summaries/:id', aiController.deleteSummary);

// AI Summary acceptance/rejection routes
router.post('/summaries/:id/accept', aiController.acceptSummary);
router.post('/summaries/:id/discard', aiController.discardSummary);

// Batch operations (ADMIN only)
router.post('/summaries/batch', requireRole(UserRole.ADMIN), aiController.batchGenerateSummaries);
router.post('/summaries/cleanup', requireRole(UserRole.ADMIN), aiController.cleanupOldSummaries);

// Usage statistics (ADMIN only)
router.get('/stats', requireRole(UserRole.ADMIN), aiController.getUsageStats);

// Legacy routes for backward compatibility
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
