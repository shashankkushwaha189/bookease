import { Router } from 'express';
import { configController } from './config.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// All config routes are ADMIN only
router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));

// Core configuration endpoints
router.get('/current', configController.getCurrent);
router.get('/history', configController.getHistory);
router.post('/', configController.save);
router.post('/rollback/:version', configController.rollback);

// Feature flag endpoints
router.get('/features', configController.getFeatures);
router.post('/features/enable', configController.enableFeature);
router.post('/features/disable', configController.disableFeature);

// Permission check endpoints
router.get('/permissions/:permission', configController.checkPermission);

// Policy validation endpoints
router.post('/validate/booking-window', configController.validateBookingWindow);
router.post('/validate/cancellation', configController.validateCancellation);
router.post('/validate/business-hours', configController.checkBusinessHours);

// Performance and monitoring endpoints
router.get('/metrics', configController.getMetrics);
router.get('/health', configController.healthCheck);
router.delete('/cache', configController.clearCache);

export default router;
