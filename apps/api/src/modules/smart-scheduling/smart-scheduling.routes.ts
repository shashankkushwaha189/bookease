import { Router } from 'express';
import { smartSchedulingController } from './smart-scheduling.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get optimized time slots for a service
router.get('/time-slots/:serviceId', smartSchedulingController.getOptimizedTimeSlots);

// Get staff recommendations for a service
router.post('/staff-recommendations/:serviceId', smartSchedulingController.getStaffRecommendations);

// Get peak hours analysis
router.get('/peak-hours', smartSchedulingController.getPeakHours);

export default router;
