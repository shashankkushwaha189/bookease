"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const helpers_1 = require("./helpers");
const client_1 = require("../src/generated/client");
(0, vitest_1.describe)('CSV Import Module', () => {
    let tenant;
    let adminToken;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenant = await prisma_1.prisma.tenant.create({
            data: { name: 'Import Tenant', slug: 'import-tenant', timezone: 'UTC' },
        });
        const passwordHash = await bcrypt_1.default.hash('Password@123', 10);
        await prisma_1.prisma.user.create({
            data: { email: 'admin@import.com', passwordHash, role: client_1.UserRole.ADMIN, tenantId: tenant.id },
        });
        const adminLoginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@import.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/import/customers', () => {
        (0, vitest_1.it)('should successfully import valid customers and return structured validation errors for bad rows', async () => {
            const csvContent = [
                'name,email,phone,tags',
                'Alice Cooper,alice@test.com,1234567890,"VIP, New"',
                ',bademail@bad.com,111,', // Missing name
                'Bob Builder,notanemail,000,Retail' // Invalid email
            ].join('\n');
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'customers.csv');
            // Expecting 200 HTTP, but partial success logically
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            const { imported, failed, errors } = res.body.data;
            (0, vitest_1.expect)(imported).toBe(1); // Alice Cooper
            (0, vitest_1.expect)(failed).toBe(2); // Missing name row, Invalid email row
            // Validate that Alice made it into the database
            const alice = await prisma_1.prisma.customer.findFirst({ where: { email: 'alice@test.com' } });
            (0, vitest_1.expect)(alice).toBeDefined();
            (0, vitest_1.expect)(alice?.name).toBe('Alice Cooper');
            // Validate error structure
            (0, vitest_1.expect)(errors.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(errors.some((e) => e.row === 2 && e.field === 'name')).toBe(true);
            (0, vitest_1.expect)(errors.some((e) => e.row === 3 && e.field === 'email')).toBe(true);
        });
        (0, vitest_1.it)('should enforce max 5MB file upload limit', async () => {
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', largeBuffer, 'huge.csv');
            // Mutler 5MB Limit violation
            (0, vitest_1.expect)(res.status).toBe(413); // Payload Too Large
        });
        (0, vitest_1.it)('should require ADMIN role to import', async () => {
            // First create a staff
            const staffPwd = await bcrypt_1.default.hash('Staff@123', 10);
            await prisma_1.prisma.user.create({
                data: { email: 'staff@import.com', passwordHash: staffPwd, role: client_1.UserRole.STAFF, tenantId: tenant.id },
            });
            const staffLogin = await (0, supertest_1.default)(app_1.app).post('/api/auth/login').set('X-Tenant-ID', tenant.id).send({ email: 'staff@import.com', password: 'Staff@123' });
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffLogin.body.data.token}`)
                .attach('file', Buffer.from('name,email\nTest,test@test.com'), 'test.csv');
            (0, vitest_1.expect)(res.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('POST /api/import/services', () => {
        (0, vitest_1.it)('should map numeric columns and defaults appropriately', async () => {
            const csvContent = [
                'name,durationMinutes,price,bufferBefore,bufferAfter',
                'Haircut,60,50,0,15', // Valid completely specified
                'Consultation,,0,0,0', // Invalid: duration needed
                'Quick Wash,15,', // Valid: missing numerics coerce or default via zod
            ].join('\n');
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/import/services')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'services.csv');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            console.log(JSON.stringify(res.body, null, 2));
            const { imported, failed } = res.body.data;
            (0, vitest_1.expect)(imported).toBe(2);
            (0, vitest_1.expect)(failed).toBe(1);
            const quickWash = await prisma_1.prisma.service.findFirst({ where: { name: 'Quick Wash' } });
            (0, vitest_1.expect)(quickWash).toBeDefined();
            // Checking the zod default logic 
            (0, vitest_1.expect)(Number(quickWash?.price)).toBe(0);
        });
    });
    (0, vitest_1.describe)('POST /api/import/staff', () => {
        (0, vitest_1.it)('should parse assignedServices logic dynamically', async () => {
            // First we need the service existing to map to
            await prisma_1.prisma.service.create({
                data: { tenantId: tenant.id, name: 'Massage', durationMinutes: 60, price: 100 }
            });
            const csvContent = [
                'name,email,assignedServices',
                'Sarah Smith,sarah@test.com,"Massage, FakeService"',
            ].join('\n');
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/import/staff')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'staff.csv');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.imported).toBe(1);
            // Let's verify Sarah exists with the relation to `Massage`
            const sarah = await prisma_1.prisma.staff.findFirst({
                where: { email: 'sarah@test.com' },
                include: { staffServices: { include: { service: true } } }
            });
            (0, vitest_1.expect)(sarah).toBeDefined();
            (0, vitest_1.expect)(sarah?.staffServices.length).toBe(1);
            (0, vitest_1.expect)(sarah?.staffServices[0].service.name).toBe('Massage');
        });
    });
});
