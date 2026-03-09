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

// Protected endpoints (auth required)
router.get('/', controller.getProfile);
router.post('/', validateBody(createBusinessProfileSchema), controller.upsertProfile);
router.patch('/', controller.updateProfile);
router.patch('/branding', controller.updateBranding);
router.patch('/policy', controller.updatePolicy);
router.patch('/seo', controller.updateSEO);
router.patch('/contact', controller.updateContact);

// Public endpoints (no auth required)
router.get('/public', controller.getPublicProfile);
router.get('/public/slug/:slug', controller.getPublicProfileBySlug);
router.get('/public/all', controller.getPublicProfiles);
router.get('/public/search', controller.searchProfiles);

// Validation endpoint
router.get('/validate', controller.validateProfileAccess);

export default router;
