import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Get audit logs with filtering (admin only)
router.get('/', authMiddleware, requireRole(UserRole.ADMIN), auditController.getLogs);

// Get AI usage analytics (admin only)
router.get('/ai-analytics', authMiddleware, requireRole(UserRole.ADMIN), auditController.getAiUsageAnalytics);

// Get correlation trail for specific request (admin only)
router.get('/correlation/:correlationId', authMiddleware, requireRole(UserRole.ADMIN), auditController.getCorrelationTrail);

// Test audit logging performance (admin only)
router.post('/test-performance', authMiddleware, requireRole(UserRole.ADMIN), auditController.testLoggingPerformance);

// Create test audit event (admin only)
router.post('/test-event', authMiddleware, requireRole(UserRole.ADMIN), auditController.createTestEvent);

export default router;
