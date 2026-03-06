import { Router } from 'express';
import { reportController } from './report.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply tenant middleware first, then auth
router.use(tenantMiddleware);
router.use(authMiddleware);

// Report endpoints (admin only)
router.get('/summary', requireRole(UserRole.ADMIN), reportController.summary);
router.get('/peak-times', requireRole(UserRole.ADMIN), reportController.peakTimes);
router.get('/staff-utilization', requireRole(UserRole.ADMIN), reportController.staffUtilization);
router.get('/export', requireRole(UserRole.ADMIN), reportController.exportData);

// Performance testing (admin only)
router.post('/test-performance', requireRole(UserRole.ADMIN), reportController.testPerformance);

// CSV validation (admin only)
router.post('/validate-csv', requireRole(UserRole.ADMIN), reportController.validateCsv);

export default router;
