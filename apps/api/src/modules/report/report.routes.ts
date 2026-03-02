import { Router } from 'express';
import { reportController } from './report.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN')); // ADMIN only

router.get('/summary', reportController.summary);
router.get('/peak-times', reportController.peakTimes);
router.get('/staff-utilization', reportController.staffUtilization);
router.get('/export', reportController.exportData);

export default router;
