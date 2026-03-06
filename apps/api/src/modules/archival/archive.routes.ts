import { Router } from 'express';
import { archiveController } from './archive.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Archive completed appointments (admin only)
router.post('/archive', authMiddleware, requireRole(UserRole.ADMIN), archiveController.archiveAppointments);

// Search archived appointments
router.get('/search', authMiddleware, archiveController.searchArchived);

// Get archive statistics (admin only)
router.get('/stats', authMiddleware, requireRole(UserRole.ADMIN), archiveController.getArchiveStats);

// Restore archived appointment (admin only)
router.post('/restore/:archivedId', authMiddleware, requireRole(UserRole.ADMIN), archiveController.restoreAppointment);

// Test archival performance (admin only)
router.post('/test-performance', authMiddleware, requireRole(UserRole.ADMIN), archiveController.testPerformance);

// Get archive configuration (admin only)
router.get('/configuration', authMiddleware, requireRole(UserRole.ADMIN), archiveController.getConfiguration);

export default router;
