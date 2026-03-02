"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.ReportController = void 0;
const report_service_1 = require("./report.service");
const errors_1 = require("../../lib/errors");
const date_fns_1 = require("date-fns");
class ReportController {
    parseDates(req) {
        const fromRaw = req.query.from;
        const toRaw = req.query.to;
        if (!fromRaw || !toRaw) {
            throw new errors_1.AppError('`from` and `to` query parameters are required in YYYY-MM-DD format.', 400, 'MISSING_DATE_PARAMS');
        }
        const fromDate = (0, date_fns_1.parseISO)(fromRaw);
        const toDate = (0, date_fns_1.parseISO)(toRaw);
        if (!(0, date_fns_1.isValid)(fromDate) || !(0, date_fns_1.isValid)(toDate)) {
            throw new errors_1.AppError('Invalid date format for `from` or `to`.', 400, 'INVALID_DATE_FORMAT');
        }
        return { fromDate, toDate };
    }
    summary = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const { fromDate, toDate } = this.parseDates(req);
            const result = await report_service_1.reportService.getSummary(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
    peakTimes = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const { fromDate, toDate } = this.parseDates(req);
            const result = await report_service_1.reportService.getPeakTimes(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
    staffUtilization = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const { fromDate, toDate } = this.parseDates(req);
            const result = await report_service_1.reportService.getStaffUtilization(tenantId, fromDate, toDate);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
    exportData = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            // For customers export, dates might not be strictly needed, but let's enforce or make optional
            const type = req.query.type;
            let fromDate = new Date(0);
            let toDate = new Date();
            if (req.query.from && req.query.to) {
                const dates = this.parseDates(req);
                fromDate = dates.fromDate;
                toDate = dates.toDate;
            }
            const csvString = await report_service_1.reportService.getExportData(tenantId, type, fromDate, toDate);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="export-${type}-${tenantId}.csv"`);
            return res.status(200).send(csvString);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ReportController = ReportController;
exports.reportController = new ReportController();
