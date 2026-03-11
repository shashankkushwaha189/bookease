import { Request, Response, NextFunction } from 'express';
import { SuperAdminService } from './superadmin.service';
import { AppError } from '../../lib/errors';

export class SuperAdminController {
    constructor(private service: SuperAdminService) {}

    // Get all tenants (super admin only)
    getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Verify super admin access (you might want to add a super admin role check)
            const tenants = await this.service.getAllTenants();
            res.json({
                success: true,
                data: tenants,
            });
        } catch (error) {
            next(error);
        }
    };

    // Create new tenant
    createTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenant = await this.service.createTenant(req.body);
            res.status(201).json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    };

    // Update tenant
    updateTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const tenant = await this.service.updateTenant(id, req.body);
            res.json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    };

    // Delete tenant
    deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await this.service.deleteTenant(id);
            res.json({
                success: true,
                message: 'Tenant deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    // Add staff to any tenant
    addStaffToTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { tenantId } = req.params;
            const staff = await this.service.addStaffToTenant(tenantId, req.body);
            res.status(201).json({
                success: true,
                data: staff,
            });
        } catch (error) {
            next(error);
        }
    };

    // Add customer to any tenant
    addCustomerToTenant = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { tenantId } = req.params;
            const customer = await this.service.addCustomerToTenant(tenantId, req.body);
            res.status(201).json({
                success: true,
                data: customer,
            });
        } catch (error) {
            next(error);
        }
    };

    // Get tenant statistics
    getTenantStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { tenantId } = req.params;
            const stats = await this.service.getTenantStats(tenantId);
            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    };
}
