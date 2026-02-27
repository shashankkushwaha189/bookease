import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

export class TenantController {
    constructor(private service: TenantService) { }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = await this.service.createTenant(req.body);
            res.status(201).json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const tenant = await this.service.getTenant(id);
            res.json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const tenant = await this.service.updateTenant(id, req.body);
            res.json({
                success: true,
                data: tenant,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            await this.service.deleteTenant(id);
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const tenants = await this.service.getAllTenants();
            res.json({
                success: true,
                data: tenants,
            });
        } catch (error) {
            next(error);
        }
    }
}
