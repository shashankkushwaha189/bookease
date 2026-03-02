import { Request, Response, NextFunction } from 'express';
import { importService } from './import.service';
import { AppError } from '../../lib/errors';

export class ImportController {

    customers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const file = req.file;
            if (!file) {
                throw new AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }

            const result = await importService.importCustomers(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    services = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const file = req.file;
            if (!file) {
                throw new AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }

            const result = await importService.importServices(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    staff = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const file = req.file;
            if (!file) {
                throw new AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }

            const result = await importService.importStaff(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}

export const importController = new ImportController();
