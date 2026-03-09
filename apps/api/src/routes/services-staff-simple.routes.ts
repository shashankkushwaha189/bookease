import { Router } from 'express';
import { serviceService } from '../modules/service/service.service';
import { staffService } from '../modules/staff/staff.service';
import { createServiceSchema, updateServiceSchema } from '../modules/service/service.schema';
import { createStaffSchema, updateStaffSchema, assignServicesSchema, updateScheduleSchema, staffTimeOffSchema, bulkTimeOffSchema } from '../modules/staff/staff.schema';
import { z } from 'zod';

const router = Router();

// ==================== SERVICE ROUTES ====================

// GET /api/services - List services
router.get('/services', async (req, res) => {
    try {
        // Mock tenant ID - in production, this would come from authentication
        const tenantId = 'tenant-123';
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_LIST_ERROR',
        });
    }
});

// GET /api/services/:id - Get service by ID
router.get('/services/:id', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_GET_ERROR',
        });
    }
});

// POST /api/services - Create new service
router.post('/services', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        
        // Validate request body
        const validated = createServiceSchema.parse(req.body);
        
        const service = await serviceService.createService(tenantId, validated);
        
        res.status(201).json({
            success: true,
            data: service,
            message: 'Service created successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_CREATE_ERROR',
        });
    }
});

// PUT /api/services/:id - Update service
router.put('/services/:id', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        // Validate request body
        const validated = updateServiceSchema.parse(req.body);
        
        const service = await serviceService.updateService(id, tenantId, validated);
        
        res.json({
            success: true,
            data: service,
            message: 'Service updated successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_UPDATE_ERROR',
        });
    }
});

// DELETE /api/services/:id - Delete service
router.delete('/services/:id', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        const result = await serviceService.softDeleteService(id, tenantId);
        
        res.json({
            success: true,
            data: result,
            message: result.deactivated ? 'Service deactivated successfully' : 'Service deleted successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_DELETE_ERROR',
        });
    }
});

// GET /api/services/categories - Get service categories
router.get('/services/categories', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const categories = await serviceService.getServicesByCategory(tenantId, true);
        
        res.json({
            success: true,
            data: categories,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'SERVICE_CATEGORIES_ERROR',
        });
    }
});

// POST /api/services/:id/assign - Assign service to staff
router.post('/services/:id/assign', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        const { staffIds } = req.body;
        
        if (!Array.isArray(staffIds)) {
            return res.status(400).json({
                success: false,
                error: 'staffIds must be an array',
                code: 'INVALID_STAFF_IDS',
            });
        }
        
        const result = await serviceService.assignServiceToStaff(id, tenantId, staffIds);
        
        res.json({
            success: true,
            data: result,
            message: 'Service assigned to staff successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'SERVICE_ASSIGN_ERROR',
        });
    }
});

// ==================== STAFF ROUTES ====================

// GET /api/staff - List staff
router.get('/staff', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
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
            staff = staff.filter((member: any) => member.department === department);
        }

        res.json({
            success: true,
            data: staff,
            count: staff.length,
        });
    } catch (error: any) {
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
        const tenantId = 'tenant-123';
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_GET_ERROR',
        });
    }
});

// POST /api/staff - Create new staff
router.post('/staff', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        
        // Validate request body
        const validated = createStaffSchema.parse(req.body);
        
        const staff = await staffService.createStaff(tenantId, validated);
        
        res.status(201).json({
            success: true,
            data: staff,
            message: 'Staff member created successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_CREATE_ERROR',
        });
    }
});

// PUT /api/staff/:id - Update staff
router.put('/staff/:id', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        // Validate request body
        const validated = updateStaffSchema.parse(req.body);
        
        const staff = await staffService.updateStaff(id, tenantId, validated);
        
        res.json({
            success: true,
            data: staff,
            message: 'Staff member updated successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_UPDATE_ERROR',
        });
    }
});

// DELETE /api/staff/:id - Delete staff
router.delete('/staff/:id', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        const result = await staffService.deleteStaff(id, tenantId);
        
        res.json({
            success: true,
            data: result,
            message: result.deactivated ? 'Staff member deactivated successfully' : 'Staff member deleted successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_DELETE_ERROR',
        });
    }
});

// POST /api/staff/:id/services - Assign services to staff
router.post('/staff/:id/services', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        // Validate request body
        const { serviceIds } = assignServicesSchema.parse(req.body);
        
        const staff = await staffService.assignServices(id, tenantId, serviceIds);
        
        res.json({
            success: true,
            data: staff,
            message: 'Services assigned to staff successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_ASSIGN_ERROR',
        });
    }
});

// POST /api/staff/:id/schedule - Set staff schedule
router.post('/staff/:id/schedule', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        // Validate request body
        const { schedules } = updateScheduleSchema.parse(req.body);
        
        const staff = await staffService.setSchedule(id, tenantId, schedules);
        
        res.json({
            success: true,
            data: staff,
            message: 'Staff schedule updated successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_SCHEDULE_ERROR',
        });
    }
});

// POST /api/staff/:id/timeoff - Add time off
router.post('/staff/:id/timeoff', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
        const { id } = req.params;
        
        // Validate request body
        const timeOffData = staffTimeOffSchema.parse(req.body);
        
        const staff = await staffService.addTimeOff(id, tenantId, timeOffData);
        
        res.json({
            success: true,
            data: staff,
            message: 'Time off added successfully',
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
            code: error.code || 'STAFF_TIMEOFF_ERROR',
        });
    }
});

// GET /api/staff/:id/availability - Check staff availability
router.get('/staff/:id/availability', async (req, res) => {
    try {
        const tenantId = 'tenant-123';
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
    } catch (error: any) {
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
        const tenantId = 'tenant-123';
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STAFF_HEALTH_ERROR',
        });
    }
});

export default router;
