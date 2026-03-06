"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importController = exports.ImportController = void 0;
const import_service_1 = require("./import.service");
const errors_1 = require("../../lib/errors");
const logger_1 = require("@bookease/logger");
class ImportController {
    /**
     * Validate CSV file before import
     */
    validateCustomers = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const validationReport = await import_service_1.importService.generateValidationReport(file.buffer, 'customers');
            logger_1.logger.info({
                tenantId,
                type: 'customers',
                totalRows: validationReport.totalRows,
                validRows: validationReport.validRows,
                invalidRows: validationReport.invalidRows,
                canPartialImport: validationReport.canPartialImport
            }, 'CSV validation completed');
            return res.status(200).json({
                success: true,
                data: validationReport
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.validateCustomers'
            }, 'Customer validation failed');
            next(error);
        }
    };
    /**
     * Enhanced customer import with partial support
     */
    customers = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            const { allowPartial = false, skipDuplicates = false } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            // Check file size for safety
            if (file.size > 50 * 1024 * 1024) { // 50MB
                throw new errors_1.AppError('File too large. Maximum size is 50MB.', 413, 'FILE_TOO_LARGE');
            }
            const result = await import_service_1.importService.importCustomers(tenantId, file.buffer, {
                allowPartial: Boolean(allowPartial),
                skipDuplicates: Boolean(skipDuplicates)
            });
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                type: 'customers',
                imported: result.imported,
                skipped: result.skipped,
                failed: result.failed,
                duration,
                fileSize: file.size
            }, 'Customer import completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                    safeHandling: true
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.customers'
            }, 'Customer import failed');
            next(error);
        }
    };
    /**
     * Validate services CSV
     */
    validateServices = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const validationReport = await import_service_1.importService.generateValidationReport(file.buffer, 'services');
            logger_1.logger.info({
                tenantId,
                type: 'services',
                totalRows: validationReport.totalRows,
                validRows: validationReport.validRows,
                invalidRows: validationReport.invalidRows,
                canPartialImport: validationReport.canPartialImport
            }, 'CSV validation completed');
            return res.status(200).json({
                success: true,
                data: validationReport
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.validateServices'
            }, 'Service validation failed');
            next(error);
        }
    };
    /**
     * Enhanced service import
     */
    services = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            const { allowPartial = false, skipDuplicates = false } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            if (file.size > 50 * 1024 * 1024) {
                throw new errors_1.AppError('File too large. Maximum size is 50MB.', 413, 'FILE_TOO_LARGE');
            }
            const result = await import_service_1.importService.importServices(tenantId, file.buffer, {
                allowPartial: Boolean(allowPartial),
                skipDuplicates: Boolean(skipDuplicates)
            });
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                type: 'services',
                imported: result.imported,
                skipped: result.skipped,
                failed: result.failed,
                duration,
                fileSize: file.size
            }, 'Service import completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                    safeHandling: true
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.services'
            }, 'Service import failed');
            next(error);
        }
    };
    /**
     * Validate staff CSV
     */
    validateStaff = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const validationReport = await import_service_1.importService.generateValidationReport(file.buffer, 'staff');
            logger_1.logger.info({
                tenantId,
                type: 'staff',
                totalRows: validationReport.totalRows,
                validRows: validationReport.validRows,
                invalidRows: validationReport.invalidRows,
                canPartialImport: validationReport.canPartialImport
            }, 'CSV validation completed');
            return res.status(200).json({
                success: true,
                data: validationReport
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.validateStaff'
            }, 'Staff validation failed');
            next(error);
        }
    };
    /**
     * Enhanced staff import
     */
    staff = async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const file = req.file;
            const { allowPartial = false, skipDuplicates = false } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            if (file.size > 50 * 1024 * 1024) {
                throw new errors_1.AppError('File too large. Maximum size is 50MB.', 413, 'FILE_TOO_LARGE');
            }
            const result = await import_service_1.importService.importStaff(tenantId, file.buffer, {
                allowPartial: Boolean(allowPartial),
                skipDuplicates: Boolean(skipDuplicates)
            });
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                tenantId,
                type: 'staff',
                imported: result.imported,
                skipped: result.skipped,
                failed: result.failed,
                duration,
                fileSize: file.size
            }, 'Staff import completed');
            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                    safeHandling: true
                }
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.staff'
            }, 'Staff import failed');
            next(error);
        }
    };
    /**
     * Get import history
     */
    getHistory = async (req, res, next) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { limit = 50 } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }
            const limitNum = parseInt(limit) || 50;
            if (limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_LIMIT',
                        message: 'Limit must be between 1 and 100'
                    }
                });
            }
            const history = await import_service_1.importService.getImportHistory(tenantId, limitNum);
            return res.status(200).json({
                success: true,
                data: history
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'import.getHistory'
            }, 'Get import history failed');
            next(error);
        }
    };
    /**
     * Get import templates
     */
    getTemplates = async (req, res, next) => {
        try {
            const templates = {
                customers: {
                    headers: ['name', 'email', 'phone', 'tags'],
                    example: [
                        ['John Doe', 'john@example.com', '555-1234', 'vip,regular'],
                        ['Jane Smith', 'jane@example.com', '555-5678', 'new']
                    ],
                    description: 'Customer data import template',
                    requiredFields: ['name', 'email'],
                    optionalFields: ['phone', 'tags']
                },
                services: {
                    headers: ['name', 'durationMinutes', 'bufferBefore', 'bufferAfter', 'price', 'description'],
                    example: [
                        ['Consultation', '30', '5', '5', '150.00', 'General consultation service'],
                        ['Checkup', '60', '10', '10', '200.00', 'Comprehensive health checkup']
                    ],
                    description: 'Service data import template',
                    requiredFields: ['name', 'durationMinutes'],
                    optionalFields: ['bufferBefore', 'bufferAfter', 'price', 'description']
                },
                staff: {
                    headers: ['name', 'email', 'phone', 'role', 'assignedServices'],
                    example: [
                        ['Dr. Smith', 'smith@clinic.com', '555-9999', 'Doctor', 'Consultation,Checkup'],
                        ['Nurse Johnson', 'johnson@clinic.com', '555-8888', 'Nurse', 'Consultation']
                    ],
                    description: 'Staff data import template',
                    requiredFields: ['name', 'email'],
                    optionalFields: ['phone', 'role', 'assignedServices']
                }
            };
            return res.status(200).json({
                success: true,
                data: templates
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                operation: 'import.getTemplates'
            }, 'Get import templates failed');
            next(error);
        }
    };
}
exports.ImportController = ImportController;
exports.importController = new ImportController();
