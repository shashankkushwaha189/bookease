import { parse } from 'csv-parse';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Readable } from 'stream';

// Schemas
export const CustomerImportRowSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    tags: z.string().optional()
});

export const ServiceImportRowSchema = z.object({
    name: z.string().min(1, "Name is required"),
    durationMinutes: z.union([z.number(), z.string()]).transform(v => {
        const num = Number(v);
        return isNaN(num) || v === '' ? undefined : num;
    }).refine(v => v !== undefined && v > 0, "Duration must be > 0"),
    bufferBefore: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Buffer before must be >= 0"),
    bufferAfter: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Buffer after must be >= 0"),
    price: z.union([z.number(), z.string(), z.undefined()]).transform(v => {
        if (v === undefined || v === '') return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Price must be >= 0"),
});

export const StaffImportRowSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    assignedServices: z.string().optional()
});

export class ImportService {

    // Core CSV parser 
    private async parseCsv<T>(buffer: Buffer, schema: z.ZodType<T>): Promise<{ rows: T[], errors: Array<{ row: number, field: string, message: string }> }> {
        return new Promise((resolve, reject) => {
            const results: T[] = [];
            const errors: Array<{ row: number, field: string, message: string }> = [];
            let rowCount = 0;

            const stream = Readable.from(buffer);
            const parser = parse({
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true
            });

            parser.on('readable', () => {
                let record;
                while ((record = parser.read()) !== null) {
                    rowCount++;

                    if (rowCount > 10000) {
                        parser.destroy(new AppError('Maximum of 10,000 rows exceeded.', 413, 'FILE_TOO_LARGE'));
                        return;
                    }

                    const parsed = schema.safeParse(record);
                    if (parsed.success) {
                        results.push(parsed.data);
                    } else {
                        parsed.error.issues.forEach((err: any) => {
                            errors.push({
                                row: rowCount,
                                field: err.path.join('.'),
                                message: err.message
                            });
                        });
                    }
                }
            });

            parser.on('error', (err) => reject(err));
            parser.on('end', () => resolve({ rows: results, errors }));

            stream.pipe(parser);
        });
    }

    async importCustomers(tenantId: string, buffer: Buffer) {
        const { rows, errors } = await this.parseCsv(buffer, CustomerImportRowSchema);

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
                const customerData = rows.map(r => ({
                    tenantId,
                    name: r.name,
                    email: r.email,
                    phone: r.phone || null,
                    tags: r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                }));

                // Handle upsert-like logic manually if needed, or simple create
                // Many times imports just skip existing emails, let's keep it simple with createMany 
                // and skipDuplicates to true so we don't crash on repeated emails inside the same file
                await tx.customer.createMany({
                    data: customerData,
                    skipDuplicates: true
                });
            });
        }

        return {
            imported: rows.length,
            failed: errors.length,
            errors
        };
    }

    async importServices(tenantId: string, buffer: Buffer) {
        const { rows, errors } = await this.parseCsv(buffer, ServiceImportRowSchema);

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
                await tx.service.createMany({
                    data: rows.map((r: any) => ({
                        tenantId,
                        name: r.name,
                        durationMinutes: r.durationMinutes as number,
                        bufferBefore: r.bufferBefore,
                        bufferAfter: r.bufferAfter,
                        price: r.price
                    })),
                    skipDuplicates: true
                });
            });
        }

        return {
            imported: rows.length,
            failed: errors.length,
            errors
        };
    }

    async importStaff(tenantId: string, buffer: Buffer) {
        const { rows, errors } = await this.parseCsv(buffer, StaffImportRowSchema);

        if (rows.length > 0) {
            await prisma.$transaction(async (tx) => {
                // Fetch existing services to map assignedServices correctly
                const existingServices = await tx.service.findMany({ where: { tenantId } });

                for (const r of rows) {
                    const staff = await tx.staff.create({
                        data: {
                            tenantId,
                            name: r.name,
                            email: r.email,
                        }
                    });

                    // Handle assumed comma-separated services
                    if (r.assignedServices) {
                        const serviceNames = r.assignedServices.split(',').map(s => s.trim().toLowerCase());
                        const matchingServices = existingServices.filter(es => serviceNames.includes(es.name.toLowerCase()));

                        if (matchingServices.length > 0) {
                            await tx.staffService.createMany({
                                data: matchingServices.map(ms => ({
                                    staffId: staff.id,
                                    serviceId: ms.id
                                }))
                            });
                        }
                    }
                }
            });
        }

        return {
            imported: rows.length,
            failed: errors.length,
            errors
        };
    }
}

export const importService = new ImportService();
