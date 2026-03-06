"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importService = exports.ImportService = exports.StaffImportRowSchema = exports.ServiceImportRowSchema = exports.CustomerImportRowSchema = void 0;
const csv_parse_1 = require("csv-parse");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const stream_1 = require("stream");
const logger_1 = require("../../utils/logger");
// Enhanced schemas with comprehensive validation
exports.CustomerImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
    email: zod_1.z.string().email("Invalid email format").max(255, "Email too long"),
    phone: zod_1.z.string().max(20, "Phone number too long").optional(),
    tags: zod_1.z.string().max(500, "Tags too long").optional()
});
exports.ServiceImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
    durationMinutes: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform(v => {
        const num = Number(v);
        return isNaN(num) || v === '' ? undefined : num;
    }).refine(v => v !== undefined && v > 0 && v <= 480, "Duration must be between 1 and 480 minutes"),
    bufferBefore: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 120, "Buffer before must be between 0 and 120 minutes"),
    bufferAfter: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 120, "Buffer after must be between 0 and 120 minutes"),
    price: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 10000, "Price must be between 0 and 10000"),
    description: zod_1.z.string().max(1000, "Description too long").optional()
});
exports.StaffImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
    email: zod_1.z.string().email("Invalid email format").max(255, "Email too long"),
    assignedServices: zod_1.z.string().max(500, "Assigned services too long").optional(),
    phone: zod_1.z.string().max(20, "Phone number too long").optional(),
    role: zod_1.z.string().max(50, "Role too long").optional()
});
class ImportService {
    /**
     * Enhanced CSV parser with large file handling and detailed validation
     */
    async parseCsv(buffer, schema, options = {}) {
        const startTime = Date.now();
        const maxRows = options.maxRows || 50000; // Increased for large files
        const { rows, errors, warnings } = await new Promise((resolve, reject) => {
            const results = [];
            const parseErrors = [];
            const parseWarnings = [];
            let rowCount = 0;
            let processedBytes = 0;
            const totalBytes = buffer.length;
            const stream = stream_1.Readable.from(buffer);
            const parser = (0, csv_parse_1.parse)({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                max_file_size: 50 * 1024 * 1024 // 50MB max file size
            });
            parser.on('readable', () => {
                let record;
                while ((record = parser.read()) !== null) {
                    rowCount++;
                    processedBytes = parser.bytes_read;
                    // Progress logging for large files
                    if (rowCount % 1000 === 0) {
                        const progress = (processedBytes / totalBytes) * 100;
                        logger_1.logger.debug({
                            processedRows: rowCount,
                            progress: `${progress.toFixed(1)}%`,
                            bytesProcessed: processedBytes
                        }, 'CSV parsing progress');
                    }
                    if (rowCount > maxRows) {
                        parser.destroy(new errors_1.AppError(`Maximum of ${maxRows} rows exceeded.`, 413, 'FILE_TOO_LARGE'));
                        return;
                    }
                    // Validate required fields presence
                    const missingFields = [];
                    if (!record.name || record.name.trim() === '')
                        missingFields.push('name');
                    if (!record.email || record.email.trim() === '')
                        missingFields.push('email');
                    if (missingFields.length > 0 && !options.allowPartial) {
                        missingFields.forEach(field => {
                            parseErrors.push({
                                row: rowCount,
                                field,
                                message: `${field} is required`,
                                severity: 'error'
                            });
                        });
                        continue;
                    }
                    const parsed = schema.safeParse(record);
                    if (parsed.success) {
                        results.push(parsed.data);
                    }
                    else {
                        parsed.error.issues.forEach((err) => {
                            const severity = err.code === 'too_small' || err.code === 'invalid_string' ? 'error' : 'warning';
                            parseErrors.push({
                                row: rowCount,
                                field: err.path.join('.'),
                                message: err.message,
                                severity
                            });
                        });
                    }
                    // Check for potential duplicates (warnings)
                    if (record.email && results.some(r => r.email === record.email)) {
                        parseWarnings.push({
                            row: rowCount,
                            field: 'email',
                            message: 'Duplicate email address may cause import issues'
                        });
                    }
                }
            });
            parser.on('error', (err) => {
                logger_1.logger.error({
                    error: err.message,
                    bytesProcessed: processedBytes
                }, 'CSV parsing error');
                reject(err);
            });
            parser.on('end', () => {
                const duration = Date.now() - startTime;
                logger_1.logger.info({
                    totalRows: rowCount,
                    validRows: results.length,
                    errorRows: parseErrors.length,
                    warningRows: parseWarnings.length,
                    duration,
                    bytesProcessed: processedBytes
                }, 'CSV parsing completed');
                resolve({
                    rows: results,
                    errors: parseErrors,
                    warnings: parseWarnings
                });
            });
            stream.pipe(parser);
        });
        return { rows, errors, warnings };
    }
    /**
     * Generate detailed row validation report
     */
    async generateValidationReport(buffer, type) {
        const startTime = Date.now();
        let schema;
        switch (type) {
            case 'customers':
                schema = exports.CustomerImportRowSchema;
                break;
            case 'services':
                schema = exports.ServiceImportRowSchema;
                break;
            case 'staff':
                schema = exports.StaffImportRowSchema;
                break;
        }
        const { rows, errors, warnings } = await this.parseCsv(buffer, schema, { allowPartial: true });
        const duration = Date.now() - startTime;
        const canPartialImport = errors.filter(e => e.severity === 'error').length < rows.length;
        const estimatedImportTime = rows.length > 0 ? (duration / rows.length) * rows.length * 2 : 0; // Rough estimate
        return {
            totalRows: rows.length + errors.length + warnings.length,
            validRows: rows.length,
            invalidRows: errors.length,
            errors: errors.map(e => ({
                ...e,
                value: '' // Would need to store original values for this
            })),
            warnings: warnings.map(w => ({
                ...w,
                value: '' // Would need to store original values for this
            })),
            canPartialImport,
            estimatedImportTime
        };
    }
    /**
     * Enhanced customer import with partial support and detailed reporting
     */
    async importCustomers(tenantId, buffer, options = {}) {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, exports.CustomerImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 10000
        });
        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
                for (const row of rows) {
                    try {
                        // Check for duplicates if skip option is enabled
                        if (options.skipDuplicates) {
                            const existing = await tx.customer.findFirst({
                                where: {
                                    tenantId,
                                    email: row.email.toLowerCase().trim()
                                }
                            });
                            if (existing) {
                                skipped++;
                                importWarnings.push({
                                    row: 0, // Would need row tracking
                                    field: 'email',
                                    message: `Customer with email ${row.email} already exists, skipped`
                                });
                                continue;
                            }
                        }
                        await tx.customer.create({
                            data: {
                                tenantId,
                                name: row.name.trim(),
                                email: row.email.toLowerCase().trim(),
                                phone: row.phone?.trim() || null,
                                tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10) : []
                            }
                        });
                        imported++;
                    }
                    catch (error) {
                        importErrors.push({
                            row: 0, // Would need row tracking
                            field: 'general',
                            message: `Failed to import customer: ${error.message}`,
                            severity: 'error'
                        });
                    }
                }
            });
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            type: 'customers',
            imported,
            skipped,
            failed: importErrors.length,
            duration,
            totalRows: rows.length
        }, 'Customer import completed');
        return {
            imported,
            failed: importErrors.length,
            skipped,
            errors: importErrors,
            warnings: importWarnings,
            summary: {
                totalRows: rows.length,
                validRows: rows.length,
                invalidRows: importErrors.length,
                processingTime: duration
            }
        };
    }
    /**
     * Enhanced service import with partial support
     */
    async importServices(tenantId, buffer, options = {}) {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, exports.ServiceImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 1000 // Services typically fewer
        });
        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
                for (const row of rows) {
                    try {
                        // Check for duplicates
                        if (options.skipDuplicates) {
                            const existing = await tx.service.findFirst({
                                where: {
                                    tenantId,
                                    name: row.name.trim()
                                }
                            });
                            if (existing) {
                                skipped++;
                                importWarnings.push({
                                    row: 0,
                                    field: 'name',
                                    message: `Service with name ${row.name} already exists, skipped`
                                });
                                continue;
                            }
                        }
                        await tx.service.create({
                            data: {
                                tenantId,
                                name: row.name.trim(),
                                durationMinutes: row.durationMinutes,
                                bufferBefore: row.bufferBefore,
                                bufferAfter: row.bufferAfter,
                                price: row.price || 0,
                                description: row.description || null
                            }
                        });
                        imported++;
                    }
                    catch (error) {
                        importErrors.push({
                            row: 0,
                            field: 'general',
                            message: `Failed to import service: ${error.message}`,
                            severity: 'error'
                        });
                    }
                }
            });
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            type: 'services',
            imported,
            skipped,
            failed: importErrors.length,
            duration,
            totalRows: rows.length
        }, 'Service import completed');
        return {
            imported,
            failed: importErrors.length,
            skipped,
            errors: importErrors,
            warnings: importWarnings,
            summary: {
                totalRows: rows.length,
                validRows: rows.length,
                invalidRows: importErrors.length,
                processingTime: duration
            }
        };
    }
    /**
     * Enhanced staff import with partial support
     */
    async importStaff(tenantId, buffer, options = {}) {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, exports.StaffImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 5000
        });
        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
                // Fetch existing services for mapping
                const existingServices = await tx.service.findMany({
                    where: { tenantId },
                    select: { id: true, name: true }
                });
                for (const row of rows) {
                    try {
                        // Check for duplicates
                        if (options.skipDuplicates) {
                            const existing = await tx.staff.findFirst({
                                where: {
                                    tenantId,
                                    email: row.email.toLowerCase().trim()
                                }
                            });
                            if (existing) {
                                skipped++;
                                importWarnings.push({
                                    row: 0,
                                    field: 'email',
                                    message: `Staff member with email ${row.email} already exists, skipped`
                                });
                                continue;
                            }
                        }
                        const staff = await tx.staff.create({
                            data: {
                                tenantId,
                                name: row.name.trim(),
                                email: row.email.toLowerCase().trim(),
                                phone: row.phone?.trim() || null
                            }
                        });
                        // Handle assigned services
                        if (row.assignedServices) {
                            const serviceNames = row.assignedServices.split(',')
                                .map(s => s.trim().toLowerCase())
                                .filter(Boolean);
                            const matchingServices = existingServices.filter(es => serviceNames.includes(es.name.toLowerCase()));
                            if (matchingServices.length > 0) {
                                await tx.staffService.createMany({
                                    data: matchingServices.map(ms => ({
                                        staffId: staff.id,
                                        serviceId: ms.id
                                    })),
                                    skipDuplicates: true
                                });
                            }
                        }
                        imported++;
                    }
                    catch (error) {
                        importErrors.push({
                            row: 0,
                            field: 'general',
                            message: `Failed to import staff: ${error.message}`,
                            severity: 'error'
                        });
                    }
                }
            });
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            tenantId,
            type: 'staff',
            imported,
            skipped,
            failed: importErrors.length,
            duration,
            totalRows: rows.length
        }, 'Staff import completed');
        return {
            imported,
            failed: importErrors.length,
            skipped,
            errors: importErrors,
            warnings: importWarnings,
            summary: {
                totalRows: rows.length,
                validRows: rows.length,
                invalidRows: importErrors.length,
                processingTime: duration
            }
        };
    }
    /**
     * Get import statistics and history
     */
    async getImportHistory(tenantId, limit = 50) {
        // This would require an import history table - for now return empty
        // In production, you'd track imports in a separate table
        return {
            imports: []
        };
    }
}
exports.ImportService = ImportService;
exports.importService = new ImportService();
