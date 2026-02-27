import { Router } from 'express';
import { BusinessProfileController } from './business-profile.controller';
import { BusinessProfileService } from './business-profile.service';
import { BusinessProfileRepository } from './business-profile.repository';
import { validateBody } from '../../middleware/validate';
import { createBusinessProfileSchema } from './business-profile.schema';

const router = Router();
const repository = new BusinessProfileRepository();
const service = new BusinessProfileService(repository);
const controller = new BusinessProfileController(service);

// Private Admin Routes (scoped by tenantId from header)
router.get('/', controller.getProfile);
router.post('/', validateBody(createBusinessProfileSchema), controller.upsertProfile);

// Public Route (also requires X-Tenant-ID but returns subset)
// We'll use a separate path for public access in app.ts but we can define it here too
router.get('/public', controller.getPublicProfile);

export default router;
