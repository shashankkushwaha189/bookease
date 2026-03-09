import { Router } from 'express';
import { serviceService } from '../modules/service/service.service';
import { staffService } from '../modules/staff/staff.service';
import { createServiceSchema, updateServiceSchema } from '../modules/service/service.schema';
import { createStaffSchema, updateStaffSchema, assignServicesSchema, updateScheduleSchema, staffTimeOffSchema, bulkTimeOffSchema } from '../modules/staff/staff.schema';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/permissions';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ==================== SERVICE ROUTES ====================

// GET /api/services - List services
router.get('/services', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { activeOnly = 'false', includeStats = 'false', search, category } = req.query;
        
        let services;
        if (search) {
            services = await serviceService.searchServices(tenantId, search as string, activeOnly === 'true');
        } else {
            services = await serviceService.listServices(
                tenantId, 
                activeOnly === 'true', 
                includeStats === 'true'
            );
        }

        // Filter by category if specified
        if (category) {
            services = services.filter(service => service.category === category);
        }

        res.json({
            success: true,
            data: services,
            count: services.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: (error as any).code || 'SERVICE_LIST_ERROR',
        });
    }
});

// GET /api/services/:id - Get service by ID
router.get('/services/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { includeStats = 'false' } = req.query;
        
        const service = await serviceService.getService(
            id, 
            tenantId, 
            includeStats === 'true'
        );
        
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found',
                code: 'SERVICE_NOT_FOUND',
            });
        }

        res.json({
            success: true,
            data: service,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: (error as any).code || 'SERVICE_GET_ERROR',
        });
    }
});

// POST /api/services - Create new service
router.post('/services', 
    authorize('services:create'),
    validateRequest(createServiceSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const service = await serviceService.createService(tenantId, req.body);
            
            res.status(201).json({
                success: true,
                data: service,
                message: 'Service created successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'SERVICE_CREATE_ERROR',
            });
        }
    }
);

// PUT /api/services/:id - Update service
router.put('/services/:id', 
    authorize('services:update'),
    validateRequest(updateServiceSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            
            const service = await serviceService.updateService(id, tenantId, req.body);
            
            res.json({
                success: true,
                data: service,
                message: 'Service updated successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'SERVICE_UPDATE_ERROR',
            });
        }
    }
);

// DELETE /api/services/:id - Delete service
router.delete('/services/:id', 
    authorize('services:delete'),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            
            const result = await serviceService.softDeleteService(id, tenantId);
            
            res.json({
                success: true,
                data: result,
                message: result.deactivated ? 'Service deactivated successfully' : 'Service deleted successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'SERVICE_DELETE_ERROR',
            });
        }
    }
);

// GET /api/services/categories - Get service categories
router.get('/services/categories', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const categories = await serviceService.getServicesByCategory(tenantId, true);
        
        res.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SERVICE_CATEGORIES_ERROR',
        });
    }
});

// POST /api/services/:id/assign - Assign service to staff
router.post('/services/:id/assign', 
    authorize('services:assign'),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            const { staffIds } = req.body;
            
            const result = await serviceService.assignServiceToStaff(id, tenantId, staffIds);
            
            res.json({
                success: true,
                data: result,
                message: 'Service assigned to staff successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: 'SERVICE_ASSIGN_ERROR',
            });
        }
    }
);

// GET /api/services/:id/staff - Get staff assigned to service
router.get('/services/:id/staff', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        
        const staff = await serviceService.getServiceStaff(id, tenantId);
        
        res.json({
            success: true,
            data: staff,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SERVICE_STAFF_ERROR',
        });
    }
});

// ==================== STAFF ROUTES ====================

// GET /api/staff - List staff
router.get('/staff', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { activeOnly = 'false', includeStats = 'false', search, department } = req.query;
        
        let staff;
        if (search) {
            staff = await staffService.searchStaff(tenantId, search as string, activeOnly === 'true');
        } else {
            staff = await staffService.listStaff(
                tenantId, 
                activeOnly === 'true', 
                includeStats === 'true'
            );
        }

        // Filter by department if specified
        if (department) {
            staff = staff.filter(member => member.department === department);
        }

        res.json({
            success: true,
            data: staff,
            count: staff.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_LIST_ERROR',
        });
    }
});

// GET /api/staff/:id - Get staff by ID
router.get('/staff/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { includeStats = 'false' } = req.query;
        
        const staff = await staffService.getStaff(id, tenantId, includeStats === 'true');
        
        if (!staff) {
            return res.status(404).json({
                success: false,
                error: 'Staff member not found',
                code: 'STAFF_NOT_FOUND',
            });
        }

        res.json({
            success: true,
            data: staff,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_GET_ERROR',
        });
    }
});

// POST /api/staff - Create new staff
router.post('/staff', 
    authorize('staff:create'),
    validateRequest(createStaffSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const staff = await staffService.createStaff(tenantId, req.body);
            
            res.status(201).json({
                success: true,
                data: staff,
                message: 'Staff member created successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'STAFF_CREATE_ERROR',
            });
        }
    }
);

// PUT /api/staff/:id - Update staff
router.put('/staff/:id', 
    authorize('staff:update'),
    validateRequest(updateStaffSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            
            const staff = await staffService.updateStaff(id, tenantId, req.body);
            
            res.json({
                success: true,
                data: staff,
                message: 'Staff member updated successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'STAFF_UPDATE_ERROR',
            });
        }
    }
);

// DELETE /api/staff/:id - Delete staff
router.delete('/staff/:id', 
    authorize('staff:delete'),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            
            const result = await staffService.deleteStaff(id, tenantId);
            
            res.json({
                success: true,
                data: result,
                message: result.deactivated ? 'Staff member deactivated successfully' : 'Staff member deleted successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: (error as any).code || 'STAFF_DELETE_ERROR',
            });
        }
    }
);

// POST /api/staff/:id/services - Assign services to staff
router.post('/staff/:id/services', 
    authorize('staff:assign'),
    validateRequest(assignServicesSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            const { serviceIds } = req.body;
            
            const staff = await staffService.assignServices(id, tenantId, serviceIds);
            
            res.json({
                success: true,
                data: staff,
                message: 'Services assigned to staff successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: 'STAFF_ASSIGN_ERROR',
            });
        }
    }
);

// POST /api/staff/:id/schedule - Set staff schedule
router.post('/staff/:id/schedule', 
    authorize('staff:schedule'),
    validateRequest(updateScheduleSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            const { schedules } = req.body;
            
            const staff = await staffService.setSchedule(id, tenantId, schedules);
            
            res.json({
                success: true,
                data: staff,
                message: 'Staff schedule updated successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: 'STAFF_SCHEDULE_ERROR',
            });
        }
    }
);

// POST /api/staff/:id/timeoff - Add time off
router.post('/staff/:id/timeoff', 
    authorize('staff:timeoff'),
    validateRequest(staffTimeOffSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            const { id } = req.params;
            
            const staff = await staffService.addTimeOff(id, tenantId, req.body);
            
            res.json({
                success: true,
                data: staff,
                message: 'Time off added successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: 'STAFF_TIMEOFF_ERROR',
            });
        }
    }
);

// POST /api/staff/bulk-timeoff - Bulk time off
router.post('/staff/bulk-timeoff', 
    authorize('staff:timeoff'),
    validateRequest(bulkTimeOffSchema),
    async (req, res) => {
        try {
            const { tenantId } = req.user;
            
            const result = await staffService.addBulkTimeOff(tenantId, req.body);
            
            res.json({
                success: true,
                data: result,
                message: 'Bulk time off added successfully',
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
                code: 'STAFF_BULK_TIMEOFF_ERROR',
            });
        }
    }
);

// GET /api/staff/:id/availability - Check staff availability
router.get('/staff/:id/availability', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Date parameter is required',
                code: 'MISSING_DATE',
            });
        }
        
        const availability = await staffService.getStaffAvailability(
            id, 
            tenantId, 
            new Date(date as string)
        );
        
        res.json({
            success: true,
            data: availability,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_AVAILABILITY_ERROR',
        });
    }
});

// GET /api/staff/:id/slots - Get available time slots
router.get('/staff/:id/slots', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { date, duration } = req.query;
        
        if (!date || !duration) {
            return res.status(400).json({
                success: false,
                error: 'Date and duration parameters are required',
                code: 'MISSING_PARAMETERS',
            });
        }
        
        const slots = await staffService.getAvailableTimeSlots(
            id,
            tenantId,
            new Date(date as string),
            parseInt(duration as string)
        );
        
        res.json({
            success: true,
            data: slots,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_SLOTS_ERROR',
        });
    }
});

// ==================== PUBLIC ROUTES (No authentication required) ====================

// GET /api/public/services - Get public services
router.get('/public/services', async (req, res) => {
    try {
        const { tenantId } = req.query;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID is required',
                code: 'MISSING_TENANT',
            });
        }
        
        const services = await serviceService.listServices(tenantId as string, true, false);
        
        res.json({
            success: true,
            data: services,
            count: services.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'PUBLIC_SERVICES_ERROR',
        });
    }
});

// GET /api/public/staff - Get public staff
router.get('/public/staff', async (req, res) => {
    try {
        const { tenantId } = req.query;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                error: 'Tenant ID is required',
                code: 'MISSING_TENANT',
            });
        }
        
        const staff = await staffService.getPublicStaff(tenantId as string);
        
        res.json({
            success: true,
            data: staff,
            count: staff.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'PUBLIC_STAFF_ERROR',
        });
    }
});

// ==================== HEALTH AND METRICS ====================

// GET /api/services/health - Service health check
router.get('/services/health', async (req, res) => {
    try {
        const health = await serviceService.healthCheck();
        
        res.json({
            success: true,
            data: health,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SERVICE_HEALTH_ERROR',
        });
    }
});

// GET /api/staff/health - Staff health check
router.get('/staff/health', async (req, res) => {
    try {
        const health = await staffService.healthCheck();
        
        res.json({
            success: true,
            data: health,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_HEALTH_ERROR',
        });
    }
});

export default router;
