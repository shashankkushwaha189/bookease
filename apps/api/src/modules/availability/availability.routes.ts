import { Router } from 'express';
import { availabilityController } from './availability.controller';
import { tenantMiddleware } from '../../middleware/tenant.middleware';

const router = Router();

// Public endpoint
router.get('/', tenantMiddleware, availabilityController.getAvailability);

export default router;
