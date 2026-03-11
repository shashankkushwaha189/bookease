import { Router } from 'express';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { validateBody } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth.middleware';
import { 
    createTenantSchema, 
    updateTenantSchema, 
    addStaffSchema, 
    addCustomerSchema 
} from './superadmin.schema';

const router = Router();
const service = new SuperAdminService();
const controller = new SuperAdminController(service);

// Super admin authentication required for all routes
router.use(authMiddleware);

// Get all tenants
router.get('/tenants', controller.getAllTenants);

// Create new tenant
router.post('/tenants', validateBody(createTenantSchema), controller.createTenant);

// Update tenant
router.put('/tenants/:id', validateBody(updateTenantSchema), controller.updateTenant);

// Delete tenant
router.delete('/tenants/:id', controller.deleteTenant);

// Add staff to tenant
router.post('/tenants/:tenantId/staff', validateBody(addStaffSchema), controller.addStaffToTenant);

// Add customer to tenant
router.post('/tenants/:tenantId/customers', validateBody(addCustomerSchema), controller.addCustomerToTenant);

// Get tenant statistics
router.get('/tenants/:tenantId/stats', controller.getTenantStats);

export default router;
