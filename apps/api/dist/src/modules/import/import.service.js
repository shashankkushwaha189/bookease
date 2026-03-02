"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importService = exports.ImportService = exports.StaffImportRowSchema = exports.ServiceImportRowSchema = exports.CustomerImportRowSchema = void 0;
const csv_parse_1 = require("csv-parse");
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const stream_1 = require("stream");
// Schemas
exports.CustomerImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    phone: zod_1.z.string().optional(),
    tags: zod_1.z.string().optional()
});
exports.ServiceImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    durationMinutes: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).transform(v => {
        const num = Number(v);
        return isNaN(num) || v === '' ? undefined : num;
    }).refine(v => v !== undefined && v > 0, "Duration must be > 0"),
    bufferBefore: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Buffer before must be >= 0"),
    bufferAfter: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Buffer after must be >= 0"),
    price: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.undefined()]).transform(v => {
        if (v === undefined || v === '')
            return 0;
        const num = Number(v);
        return isNaN(num) ? 0 : Math.abs(num);
    }).refine(v => v >= 0, "Price must be >= 0"),
});
exports.StaffImportRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email("Invalid email format"),
    assignedServices: zod_1.z.string().optional()
});
class ImportService {
    // Core CSV parser 
    async parseCsv(buffer, schema) {
        return new Promise((resolve, reject) => {
            const results = [];
            const errors = [];
            let rowCount = 0;
            const stream = stream_1.Readable.from(buffer);
            const parser = (0, csv_parse_1.parse)({
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
                        parser.destroy(new errors_1.AppError('Maximum of 10,000 rows exceeded.', 413, 'FILE_TOO_LARGE'));
                        return;
                    }
                    const parsed = schema.safeParse(record);
                    if (parsed.success) {
                        results.push(parsed.data);
                    }
                    else {
                        parsed.error.issues.forEach((err) => {
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
    async importCustomers(tenantId, buffer) {
        const { rows, errors } = await this.parseCsv(buffer, exports.CustomerImportRowSchema);
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
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
    async importServices(tenantId, buffer) {
        const { rows, errors } = await this.parseCsv(buffer, exports.ServiceImportRowSchema);
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
                await tx.service.createMany({
                    data: rows.map((r) => ({
                        tenantId,
                        name: r.name,
                        durationMinutes: r.durationMinutes,
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
    async importStaff(tenantId, buffer) {
        const { rows, errors } = await this.parseCsv(buffer, exports.StaffImportRowSchema);
        if (rows.length > 0) {
            await prisma_1.prisma.$transaction(async (tx) => {
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
exports.ImportService = ImportService;
exports.importService = new ImportService();
