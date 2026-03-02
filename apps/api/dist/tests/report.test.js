"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const helpers_1 = require("./helpers");
const client_1 = require("../src/generated/client");
const date_fns_1 = require("date-fns");
const archival_job_1 = require("../src/jobs/archival.job");
(0, vitest_1.describe)('Reports & Archival Modules', () => {
    let tenant;
    let adminToken;
    let staffToken;
    let service;
    let staffMem;
    let customer;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Report Tenant',
                slug: 'report-tenant',
                timezone: 'UTC',
            },
        });
        const passwordHash = await bcrypt_1.default.hash('Password@123', 10);
        const adminUser = await prisma_1.prisma.user.create({
            data: { email: 'admin@report.com', passwordHash, role: client_1.UserRole.ADMIN, tenantId: tenant.id },
        });
        const staffUser = await prisma_1.prisma.user.create({
            data: { email: 'staff@report.com', passwordHash, role: client_1.UserRole.STAFF, tenantId: tenant.id },
        });
        // Get tokens
        const adminLoginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@report.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;
        const staffLoginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'staff@report.com', password: 'Password@123' });
        staffToken = staffLoginRes.body.data.token;
        // Seed basic entities
        service = await prisma_1.prisma.service.create({
            data: { tenantId: tenant.id, name: 'Test Service', durationMinutes: 60, price: 100 }
        });
        staffMem = await prisma_1.prisma.staff.create({
            data: { tenantId: tenant.id, name: 'Test Staff', email: 'staff1@report.com' }
        });
        customer = await prisma_1.prisma.customer.create({
            data: { tenantId: tenant.id, name: 'Test Customer', email: 'cust@report.com' }
        });
        const now = new Date();
        // Seed Appointments
        await prisma_1.prisma.appointment.createMany({
            data: [
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-1',
                    startTimeUtc: (0, date_fns_1.startOfDay)(now),
                    endTimeUtc: (0, date_fns_1.endOfDay)(now),
                    status: client_1.AppointmentStatus.COMPLETED,
                    createdAt: now
                },
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-2',
                    startTimeUtc: (0, date_fns_1.startOfDay)(now),
                    endTimeUtc: (0, date_fns_1.endOfDay)(now),
                    status: client_1.AppointmentStatus.NO_SHOW,
                    createdAt: now
                },
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-3',
                    startTimeUtc: (0, date_fns_1.startOfDay)(now),
                    endTimeUtc: (0, date_fns_1.endOfDay)(now),
                    status: client_1.AppointmentStatus.CANCELLED,
                    createdAt: now
                },
                // Archival candidates (13 months old)
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-ARCH-1',
                    startTimeUtc: (0, date_fns_1.subMonths)(now, 13),
                    endTimeUtc: (0, date_fns_1.subMonths)(now, 13),
                    status: client_1.AppointmentStatus.COMPLETED,
                    createdAt: (0, date_fns_1.subMonths)(now, 13)
                }
            ]
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('Reports API', () => {
        const from = '2000-01-01';
        const to = '2099-12-31';
        (0, vitest_1.it)('should block non-admins from reports', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .get(`/api/reports/summary?from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffToken}`); // Staff Token
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should return summary for admin', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .get(`/api/reports/summary?from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.totalAppointments).toBe(4);
            (0, vitest_1.expect)(res.body.data.completedCount).toBe(2); // 1 now + 1 from 13 mos ago
            (0, vitest_1.expect)(res.body.data.noShowCount).toBe(1);
            (0, vitest_1.expect)(res.body.data.noShowRate).toBe(25); // 1 / 4 * 100
            (0, vitest_1.expect)(res.body.data.bookingsByService.length).toBe(1);
        });
        (0, vitest_1.it)('should return export csv', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .get(`/api/reports/export?type=appointments&from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.headers['content-type']).toContain('text/csv');
            (0, vitest_1.expect)(res.text).toContain('BK-1');
            (0, vitest_1.expect)(res.text).toContain('BK-2');
            (0, vitest_1.expect)(res.text).toContain('NO_SHOW');
        });
    });
    (0, vitest_1.describe)('Archival Job', () => {
        (0, vitest_1.it)('should move appointments older than 12 months to archive', async () => {
            // Initially, there are 4 in appointment table
            const beforeCount = await prisma_1.prisma.appointment.count({ where: { tenantId: tenant.id } });
            (0, vitest_1.expect)(beforeCount).toBe(4);
            const beforeArchive = await prisma_1.prisma.appointmentArchive.count({ where: { tenantId: tenant.id } });
            (0, vitest_1.expect)(beforeArchive).toBe(0);
            // Run archival job manually
            await archival_job_1.archivalJob.runArchivalProcess();
            // After, the 13-month old one should be moved
            const afterCount = await prisma_1.prisma.appointment.count({ where: { tenantId: tenant.id } });
            (0, vitest_1.expect)(afterCount).toBe(3);
            const afterArchive = await prisma_1.prisma.appointmentArchive.count({ where: { tenantId: tenant.id } });
            (0, vitest_1.expect)(afterArchive).toBe(1);
            const archiveRecord = await prisma_1.prisma.appointmentArchive.findFirst({ where: { tenantId: tenant.id } });
            (0, vitest_1.expect)(archiveRecord?.referenceId).toBe('BK-ARCH-1');
        });
        (0, vitest_1.it)('should allow querying archives via API', async () => {
            // Standard query returns 3
            const res1 = await (0, supertest_1.default)(app_1.app)
                .get('/api/appointments?limit=10')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            // DEBUG LOGS
            if (res1.status !== 200)
                console.log('RES1 ERR:', res1.body);
            (0, vitest_1.expect)(res1.status).toBe(200);
            (0, vitest_1.expect)(res1.body.total).toBe(3);
            // Archive query returns 1
            const res2 = await (0, supertest_1.default)(app_1.app)
                .get('/api/appointments?isArchived=true&limit=10')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            if (res2.status !== 200)
                console.log('RES2 ERR:', res2.body);
            (0, vitest_1.expect)(res2.status).toBe(200);
            (0, vitest_1.expect)(res2.body.total).toBe(1);
            (0, vitest_1.expect)(res2.body.items[0].referenceId).toBe('BK-ARCH-1');
        });
    });
});
