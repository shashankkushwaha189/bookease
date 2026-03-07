import { parse } from 'csv-parse';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Readable } from 'stream';
import { logger } from '../../utils/logger';

// Enhanced schemas with comprehensive validation
export const CustomerImportRowSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format").max(255, "Email too long"),
    phone: z.string().max(20, "Phone number too long").optional(),
    tags: z.string().max(500, "Tags too long").optional()
});

export const ServiceImportRowSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    durationMinutes: z.union([z.number(), z.string()]).transform(v => {
        const num = Number(v);
        return isNaN(num) || v === '' ? undefined : num;
    }).refine(v => v !== undefined && v > 0 && v <= 480, "Duration must be between 1 and 480 minutes"),
    bufferBefore: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 120, "Buffer before must be between 0 and 120 minutes"),
    bufferAfter: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 120, "Buffer after must be between 0 and 120 minutes"),
    price: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0 && v <= 10000, "Price must be between 0 and 10000"),
    description: z.string().max(1000, "Description too long").optional()
});

export const StaffImportRowSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format").max(255, "Email too long"),
    assignedServices: z.string().max(500, "Assigned services too long").optional(),
    phone: z.string().max(20, "Phone number too long").optional(),
    role: z.string().max(50, "Role too long").optional()
});

export interface ImportResult {
    imported: number;
    failed: number;
    skipped: number;
    errors: Array<{
        row: number;
        field: string;
        message: string;
        severity: 'error' | 'warning';
    }>;
    warnings: Array<{
        row: number;
        field: string;
        message: string;
    }>;
    summary: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
        processingTime: number;
    };
}

export interface RowValidationReport {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: Array<{
        row: number;
        field: string;
        message: string;
        severity: 'error' | 'warning';
        value?: string;
    }>;
    warnings: Array<{
        row: number;
        field: string;
        message: string;
        value?: string;
    }>;
    canPartialImport: boolean;
    estimatedImportTime: number;
}

export class ImportService {

    /**
     * Enhanced CSV parser with large file handling and detailed validation
     */
    private async parseCsv<T>(
        buffer: Buffer, 
        schema: z.ZodType<T>,
        options: {
            maxRows?: number;
            allowPartial?: boolean;
        } = {}
    ): Promise<{ 
        rows: T[], 
        errors: Array<{ row: number, field: string, message: string, severity: 'error' | 'warning' }>,
        warnings: Array<{ row: number, field: string, message: string }>
    }> {
        const startTime = Date.now();
        const maxRows = options.maxRows || 50000; // Increased for large files
        const { rows, errors, warnings } = await new Promise<{
            rows: T[],
            errors: Array<{ row: number, field: string, message: string, severity: 'error' | 'warning' }>,
            warnings: Array<{ row: number, field: string, message: string }>
        }>((resolve, reject) => {
            const results: T[] = [];
            const parseErrors: Array<{ row: number, field: string, message: string, severity: 'error' | 'warning' }> = [];
            const parseWarnings: Array<{ row: number, field: string, message: string }> = [];
            let rowCount = 0;
            let processedBytes = 0;
            const totalBytes = buffer.length;

            const stream = Readable.from(buffer);
            const parser = parse();
            
            stream.pipe(parser);

            parser.on('readable', () => {
                let record: any;
                while ((record = parser.read()) !== null) {
                    rowCount++;
                    processedBytes = (parser as any).bytes_read || 0;

                    // Progress logging for large files
                    if (rowCount % 1000 === 0) {
                        const progress = (processedBytes / totalBytes) * 100;
                        logger.info('Import progress', { processedRows: rowCount, progress: `${((processedBytes / totalBytes) * 100).toFixed(1)}%`, bytesProcessed: processedBytes });
                    }

                    if (rowCount > maxRows) {
                        parser.destroy(new AppError(`Maximum of ${maxRows} rows exceeded.`, 413, 'FILE_TOO_LARGE'));
                        return;
                    }

                    // Validate required fields presence
                    const missingFields = [];
                    if (!record.name || record.name.trim() === '') missingFields.push('name');
                    if (!record.email || record.email.trim() === '') missingFields.push('email');

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
                    } else {
                        parsed.error.issues.forEach((err: any) => {
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
                    if (record.email && results.some(r => (r as any).email === record.email)) {
                        parseWarnings.push({
                            row: rowCount,
                            field: 'email',
                            message: 'Duplicate email address may cause import issues'
                        });
                    }
                }
            });

            parser.on('error', (err) => {
                logger.error('CSV parsing error', { error: err instanceof Error ? err.message : String(err), bytesProcessed: processedBytes });
                reject(err);
            });

            parser.on('end', () => {
                const duration = Date.now() - startTime;
                logger.info('CSV parsing completed', { totalRows: rowCount, validRows: results.length, errorRows: parseErrors.length, warningRows: parseWarnings.length, duration, bytesProcessed: processedBytes });

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
    async generateValidationReport(
        buffer: Buffer, 
        type: 'customers' | 'services' | 'staff'
    ): Promise<RowValidationReport> {
        const startTime = Date.now();
        
        let schema: z.ZodType<any>;
        switch (type) {
            case 'customers':
                schema = CustomerImportRowSchema;
                break;
            case 'services':
                schema = ServiceImportRowSchema;
                break;
            case 'staff':
                schema = StaffImportRowSchema;
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
    async importCustomers(tenantId: string, buffer: Buffer, options: {
        allowPartial?: boolean;
        skipDuplicates?: boolean;
    } = {}): Promise<ImportResult> {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, CustomerImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 10000
        });

        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
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
                    } catch (error: any) {
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
        
        logger.info('Customer import completed', { tenantId, type: 'customers', imported, skipped, failed: importErrors.length, duration, totalRows: rows.length });

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
    async importServices(tenantId: string, buffer: Buffer, options: {
        allowPartial?: boolean;
        skipDuplicates?: boolean;
    } = {}): Promise<ImportResult> {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, ServiceImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 1000 // Services typically fewer
        });

        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
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
                                durationMinutes: row.durationMinutes as number,
                                bufferBefore: row.bufferBefore,
                                bufferAfter: row.bufferAfter,
                                price: row.price || 0,
                                description: (row as any).description || null
                            }
                        });
                        imported++;
                    } catch (error: any) {
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
        
        logger.info('Service import completed', { tenantId, type: 'services', imported, skipped, failed: importErrors.length, duration, totalRows: rows.length });

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
    async importStaff(tenantId: string, buffer: Buffer, options: {
        allowPartial?: boolean;
        skipDuplicates?: boolean;
    } = {}): Promise<ImportResult> {
        const startTime = Date.now();
        const { rows, errors, warnings } = await this.parseCsv(buffer, StaffImportRowSchema, {
            allowPartial: options.allowPartial,
            maxRows: 5000
        });

        let imported = 0;
        let skipped = 0;
        const importErrors = [...errors];
        const importWarnings = [...warnings];

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
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
                                email: row.email.toLowerCase().trim()
                            }
                        });

                        // Handle assigned services
                        if (row.assignedServices) {
                            const serviceNames = row.assignedServices.split(',')
                                .map(s => s.trim().toLowerCase())
                                .filter(Boolean);

                            const matchingServices = existingServices.filter(es => 
                                serviceNames.includes(es.name.toLowerCase())
                            );

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
                    } catch (error: any) {
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
        
        logger.info('Staff import completed', { tenantId, type: 'staff', imported, skipped, failed: importErrors.length, duration, totalRows: rows.length });

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
    async getImportHistory(tenantId: string, limit: number = 50): Promise<{
        imports: Array<{
            id: string;
            type: string;
            status: string;
            imported: number;
            failed: number;
            skipped: number;
            createdAt: Date;
            processingTime: number;
        }>;
    }> {
        // This would require an import history table - for now return empty
        // In production, you'd track imports in a separate table
        return {
            imports: []
        };
    }
}

export const importService = new ImportService();
