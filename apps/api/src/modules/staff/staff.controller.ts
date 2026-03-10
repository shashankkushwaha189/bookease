import { Request, Response, NextFunction } from 'express';
import { staffService } from './staff.service';
import {
    createStaffSchema,
    updateStaffSchema,
    updateScheduleSchema,
    staffTimeOffSchema,
    assignServicesSchema,
} from './staff.schema';
import { logger } from '@bookease/logger';

export class StaffController {
    async list(req: Request, res: Response) {
        try {
            const isPublic = req.originalUrl.includes('/public/');
            const activeOnly = isPublic;
            // For public routes, don't require tenant ID
            const tenantId = isPublic ? undefined : req.tenantId;
            const staffList = await staffService.listStaff(tenantId, activeOnly);

            const responseData = activeOnly
                ? staffList.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    photoUrl: s.photoUrl,
                    services: s.staffServices.map((ss: any) => ss.service),
                }))
                : staffList;

            res.json({
                success: true,
                data: responseData,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error listing staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff' },
            });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const staff = await staffService.getStaff(req.params.id as string, req.tenantId!);
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, data: staff });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error fetching staff by id');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff member' },
            });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const validated = createStaffSchema.safeParse(req.body);
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

            const staff = await staffService.createStaff(req.tenantId!, validated.data);
            res.status(201).json({ success: true, data: staff });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error creating staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create staff member' },
            });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const validated = updateStaffSchema.safeParse(req.body);
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

            const staff = await staffService.updateStaff(req.params.id as string, req.tenantId!, validated.data);
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, data: staff });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error updating staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update staff member' },
            });
        }
    }

    getPublicStaff = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staff = await staffService.getPublicStaff(req.tenantId!);
            res.json({
                success: true,
                data: staff,
            });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error fetching public staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch staff members' },
            });
        }
    };

    async assignServices(req: Request, res: Response) {
        try {
            const validated = assignServicesSchema.safeParse(req.body);
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

            const staff = await staffService.assignServices(req.params.id as string, req.tenantId!, validated.data.serviceIds);
            res.json({ success: true, data: staff });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }

    async setSchedule(req: Request, res: Response) {
        try {
            const validated = updateScheduleSchema.safeParse(req.body);
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

            const staff = await staffService.setSchedule(req.params.id as string, req.tenantId!, validated.data.schedules);
            res.json({ success: true, data: staff });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }

    async addTimeOff(req: Request, res: Response) {
        try {
            const validated = staffTimeOffSchema.safeParse(req.body);
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

            const staff = await staffService.addTimeOff(req.params.id as string, req.tenantId!, validated.data);
            res.json({ success: true, data: staff });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: error.message },
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const success = await staffService.deleteStaff(req.params.id as string, req.tenantId!);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Staff member not found' },
                });
            }
            res.json({ success: true, message: 'Staff member deleted successfully' });
        } catch (error) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error deleting staff');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete staff member' },
            });
        }
    }
}

export const staffController = new StaffController();
