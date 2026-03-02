import { Request, Response } from 'express';
import { auditService } from './audit.service';

export class AuditController {
    getLogs = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { page = 1, limit = 10, action } = req.query;

            const logs = await auditService.getLogs({
                tenantId,
                page: Number(page),
                limit: Number(limit),
                action: action as string,
            });

            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const auditController = new AuditController();
