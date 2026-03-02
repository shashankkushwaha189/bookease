import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { AppError } from '../../lib/errors';
import { parseISO, isValid } from 'date-fns';

export class ReportController {

    private parseDates(req: Request) {
        const fromRaw = req.query.from as string;
        const toRaw = req.query.to as string;

        if (!fromRaw || !toRaw) {
            throw new AppError('`from` and `to` query parameters are required in YYYY-MM-DD format.', 400, 'MISSING_DATE_PARAMS');
        }

        const fromDate = parseISO(fromRaw);
        const toDate = parseISO(toRaw);

        if (!isValid(fromDate) || !isValid(toDate)) {
            throw new AppError('Invalid date format for `from` or `to`.', 400, 'INVALID_DATE_FORMAT');
        }

        return { fromDate, toDate };
    }

    summary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const { fromDate, toDate } = this.parseDates(req);

            const result = await reportService.getSummary(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    peakTimes = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const { fromDate, toDate } = this.parseDates(req);

            const result = await reportService.getPeakTimes(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    staffUtilization = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            const { fromDate, toDate } = this.parseDates(req);

            const result = await reportService.getStaffUtilization(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    exportData = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId!;
            // For customers export, dates might not be strictly needed, but let's enforce or make optional
            const type = req.query.type as 'appointments' | 'customers';

            let fromDate = new Date(0);
            let toDate = new Date();

            if (req.query.from && req.query.to) {
                const dates = this.parseDates(req);
                fromDate = dates.fromDate;
                toDate = dates.toDate;
            }

            const csvString = await reportService.getExportData(tenantId, type, fromDate, toDate);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="export-${type}-${tenantId}.csv"`);
            return res.status(200).send(csvString);
        } catch (error) {
            next(error);
        }
    };
}

export const reportController = new ReportController();
