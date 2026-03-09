"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffController = exports.StaffController = void 0;
const staff_service_1 = require("./staff.service");
const staff_schema_1 = require("./staff.schema");
const logger_1 = require("@bookease/logger");
class StaffController {
    async list(req, res) {
        try {
            const activeOnly = req.originalUrl.includes('/public/');
            const staffList = await staff_service_1.staffService.listStaff(req.tenantId, activeOnly);
            const responseData = activeOnly
                ? staffList.map((s) => ({
                    id: s.id,
                    name: s.name,
                    photoUrl: s.photoUrl,
                    services: s.staffServices.map((ss) => ss.service),
                }))
                : staffList;
            res.json({
                success: true,
                data: responseData,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error listing staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff' },
            });
        }
    }
    async getById(req, res) {
        try {
            const staff = await staff_service_1.staffService.getStaff(req.params.id, req.tenantId);
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, data: staff });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error fetching staff by id');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff member' },
            });
        }
    }
    async create(req, res) {
        try {
            const validated = staff_schema_1.createStaffSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid staff data',
                        details: validated.error.format(),
                    },
                });
            }
            const staff = await staff_service_1.staffService.createStaff(req.tenantId, validated.data);
            res.status(201).json({ success: true, data: staff });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error creating staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create staff member' },
            });
        }
    }
    async update(req, res) {
        try {
            const validated = staff_schema_1.updateStaffSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid staff data',
                        details: validated.error.format(),
                    },
                });
            }
            const staff = await staff_service_1.staffService.updateStaff(req.params.id, req.tenantId, validated.data);
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, data: staff });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error updating staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update staff member' },
            });
        }
    }
    getPublicStaff = async (req, res, next) => {
        try {
            const staff = await staff_service_1.staffService.getPublicStaff(req.tenantId);
            res.json({
                success: true,
                data: staff,
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error fetching public staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff members' },
            });
        }
    };
    async assignServices(req, res) {
        try {
            const validated = staff_schema_1.assignServicesSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid service IDs',
                        details: validated.error.format(),
                    },
                });
            }
            const staff = await staff_service_1.staffService.assignServices(req.params.id, req.tenantId, validated.data.serviceIds);
            res.json({ success: true, data: staff });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }
    async setSchedule(req, res) {
        try {
            const validated = staff_schema_1.updateScheduleSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid schedule data',
                        details: validated.error.format(),
                    },
                });
            }
            const staff = await staff_service_1.staffService.setSchedule(req.params.id, req.tenantId, validated.data.schedules);
            res.json({ success: true, data: staff });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }
    async addTimeOff(req, res) {
        try {
            const validated = staff_schema_1.staffTimeOffSchema.safeParse(req.body);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid time-off data',
                        details: validated.error.format(),
                    },
                });
            }
            const staff = await staff_service_1.staffService.addTimeOff(req.params.id, req.tenantId, validated.data);
            res.json({ success: true, data: staff });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }
    async delete(req, res) {
        try {
            const success = await staff_service_1.staffService.deleteStaff(req.params.id, req.tenantId);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, message: 'Staff member deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error({ err: error, tenantId: req.tenantId }, 'Error deleting staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete staff member' },
            });
        }
    }
}
exports.StaffController = StaffController;
exports.staffController = new StaffController();
