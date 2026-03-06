"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.ReportController = void 0;
const report_service_1 = require("./report.service");
const errors_1 = require("../../lib/errors");
const date_fns_1 = require("date-fns");
const logger_1 = require("@bookease/logger");
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
        // Ensure dates are at start/end of day for proper filtering
        return {
            fromDate: (0, date_fns_1.startOfDay)(fromDate),
            toDate: (0, date_fns_1.endOfDay)(toDate)
        };
    }
    validatePagination(req) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        if (page < 1) {
            throw new errors_1.AppError('Page must be greater than 0', 400, 'INVALID_PAGE');
        }
        if (limit < 1 || limit > 1000) {
            throw new errors_1.AppError('Limit must be between 1 and 1000', 400, 'INVALID_LIMIT');
        }
        return { page, limit };
    }
    /**
     * Get comprehensive report summary with filtering and pagination
     */
    summary = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { fromDate, toDate } = this.parseDates(req);
            const { page, limit } = this.validatePagination(req);
            const { serviceId, staffId, status } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            const query = {
                tenantId,
                fromDate,
                toDate,
                serviceId: serviceId,
                staffId: staffId,
                status: status,
                page,
                limit
            };
            const result = await report_service_1.reportService.getSummary(query);
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                operation: 'report.summary',
                duration,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'Report summary completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    page,
                    limit,
                    duration: `${duration}ms`,
                    performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.summary'
            }, 'Report summary failed');
            next(error);
        }
    };
    /**
     * Get peak booking times analysis
     */
    peakTimes = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { fromDate, toDate } = this.parseDates(req);
            const { page, limit } = this.validatePagination(req);
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            const query = {
                tenantId,
                fromDate,
                toDate,
                page,
                limit
            };
            const result = await report_service_1.reportService.getPeakTimes(query);
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                operation: 'report.peakTimes',
                duration,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'Peak times analysis completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    page,
                    limit,
                    duration: `${duration}ms`,
                    performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.peakTimes'
            }, 'Peak times analysis failed');
            next(error);
        }
    };
    /**
     * Get staff utilization report
     */
    staffUtilization = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { fromDate, toDate } = this.parseDates(req);
            const { page, limit } = this.validatePagination(req);
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            const query = {
                tenantId,
                fromDate,
                toDate,
                page,
                limit
            };
            const result = await report_service_1.reportService.getStaffUtilization(query);
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                operation: 'report.staffUtilization',
                duration,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'Staff utilization report completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    page,
                    limit,
                    duration: `${duration}ms`,
                    performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.staffUtilization'
            }, 'Staff utilization report failed');
            next(error);
        }
    };
    /**
     * Export data as CSV with validation
     */
    exportData = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const type = req.query.type;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!type || !['appointments', 'customers'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_EXPORT_TYPE',
                        message: 'Export type must be either "appointments" or "customers"'
                    }
                });
            }
            let fromDate = new Date(0);
            let toDate = new Date();
            if (req.query.from && req.query.to) {
                const dates = this.parseDates(req);
                fromDate = dates.fromDate;
                toDate = dates.toDate;
            }
            const csvString = await report_service_1.reportService.getExportData(tenantId, type, fromDate, toDate);
            // Validate CSV integrity
            const validation = await report_service_1.reportService.validateCsvExport(csvString, type, tenantId);
            if (!validation.isValid) {
                logger_1.logger.warn({
                    tenantId,
                    type,
                    issues: validation.issues
                }, 'CSV validation failed');
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                type,
                recordCount: validation.recordCount,
                duration,
                isValid: validation.isValid,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'CSV export completed');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="export-${type}-${tenantId}-${Date.now()}.csv"`);
            res.setHeader('X-Record-Count', validation.recordCount.toString());
            res.setHeader('X-Validation-Status', validation.isValid ? 'VALID' : 'INVALID');
            return res.status(200).send(csvString);
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.exportData'
            }, 'CSV export failed');
            next(error);
        }
    };
    /**
     * Test report performance (admin only)
     */
    testPerformance = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { iterations = 10, reportType = 'summary' } = req.body;
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to test report performance'
                    }
                });
            }
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            // Validate iterations
            if (iterations < 1 || iterations > 100) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ITERATIONS',
                        message: 'Iterations must be between 1 and 100'
                    }
                });
            }
            const results = [];
            const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
            const toDate = new Date();
            for (let i = 0; i < iterations; i++) {
                const iterationStart = Date.now();
                switch (reportType) {
                    case 'summary':
                        await report_service_1.reportService.getSummary({
                            tenantId,
                            fromDate,
                            toDate,
                            page: 1,
                            limit: 50
                        });
                        break;
                    case 'peakTimes':
                        await report_service_1.reportService.getPeakTimes({
                            tenantId,
                            fromDate,
                            toDate,
                            page: 1,
                            limit: 50
                        });
                        break;
                    case 'staffUtilization':
                        await report_service_1.reportService.getStaffUtilization({
                            tenantId,
                            fromDate,
                            toDate,
                            page: 1,
                            limit: 50
                        });
                        break;
                    default:
                        throw new errors_1.AppError('Invalid report type', 400, 'INVALID_REPORT_TYPE');
                }
                const iterationDuration = Date.now() - iterationStart;
                results.push(iterationDuration);
            }
            const avgDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;
            const maxDuration = Math.max(...results);
            const minDuration = Math.min(...results);
            const under2s = results.filter(duration => duration < 2000).length;
            const performanceResult = {
                iterations,
                reportType,
                averageDuration: `${avgDuration.toFixed(2)}ms`,
                maxDuration: `${maxDuration}ms`,
                minDuration: `${minDuration}ms`,
                under2sCount: under2s,
                under2sPercentage: `${((under2s / iterations) * 100).toFixed(1)}%`,
                meetsRequirement: avgDuration < 2000
            };
            logger_1.logger.info({
                tenantId,
                ...performanceResult
            }, 'Report performance test completed');
            return res.status(200).json({
                success: true,
                data: performanceResult
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.testPerformance'
            }, 'Report performance test failed');
            next(error);
        }
    };
    /**
     * Validate CSV export integrity
     */
    validateCsv = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { type, csvData } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!type || !['appointments', 'customers'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_TYPE',
                        message: 'Type must be either "appointments" or "customers"'
                    }
                });
            }
            if (!csvData) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_CSV_DATA',
                        message: 'CSV data is required'
                    }
                });
            }
            const validation = await report_service_1.reportService.validateCsvExport(csvData, type, tenantId);
            logger_1.logger.info({
                tenantId,
                type,
                isValid: validation.isValid,
                recordCount: validation.recordCount,
                issues: validation.issues.length
            }, 'CSV validation completed');
            return res.status(200).json({
                success: true,
                data: validation
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'report.validateCsv'
            }, 'CSV validation failed');
            next(error);
        }
    };
}
exports.ReportController = ReportController;
exports.reportController = new ReportController();
