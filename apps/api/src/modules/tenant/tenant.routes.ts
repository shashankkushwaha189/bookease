import { Router } from 'express';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { validateBody } from '../../middleware/validate';
import { createTenantSchema, updateTenantSchema } from './tenant.schema';

const router = Router();

// DI - Manual for now, can use a container later
const repository = new TenantRepository();
const service = new TenantService(repository);
const controller = new TenantController(service);

// Public tenant endpoints (no auth required) - MUST BE FIRST
router.get('/public', (req, res, next) => controller.getPublicTenants(req, res, next));
router.get('/public/slug/:slug', (req, res, next) => controller.getPublicTenantBySlug(req, res, next));
router.get('/public/domain/:domain', (req, res, next) => controller.getPublicTenantByDomain(req, res, next));
router.get('/public/search', (req, res, next) => controller.searchTenants(req, res, next));

// Tenant validation endpoint
router.get('/validate', (req, res, next) => controller.validateTenantAccess(req, res, next));

// Admin-only tenant management (auth required)
router.post('/', validateBody(createTenantSchema), (req, res, next) => controller.create(req, res, next));
router.get('/', (req, res, next) => controller.list(req, res, next));
router.get('/:id', (req, res, next) => controller.getOne(req, res, next));
router.patch('/:id', validateBody(updateTenantSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
