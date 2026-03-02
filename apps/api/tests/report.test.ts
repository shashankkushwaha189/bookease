import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';
import { AppointmentStatus, UserRole } from '../src/generated/client';
import { subMonths, parseISO, startOfDay, endOfDay } from 'date-fns';
import { archivalJob } from '../src/jobs/archival.job';

describe('Reports & Archival Modules', () => {
    let tenant: any;
    let adminToken: string;
    let staffToken: string;
    let service: any;
    let staffMem: any;
    let customer: any;

    beforeAll(async () => {
        await cleanupDatabase();

        tenant = await prisma.tenant.create({
            data: {
                name: 'Report Tenant',
                slug: 'report-tenant',
                timezone: 'UTC',
            },
        });

        const passwordHash = await bcrypt.hash('Password@123', 10);

        const adminUser = await prisma.user.create({
            data: { email: 'admin@report.com', passwordHash, role: UserRole.ADMIN, tenantId: tenant.id },
        });

        const staffUser = await prisma.user.create({
            data: { email: 'staff@report.com', passwordHash, role: UserRole.STAFF, tenantId: tenant.id },
        });

        // Get tokens
        const adminLoginRes = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@report.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;

        const staffLoginRes = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'staff@report.com', password: 'Password@123' });
        staffToken = staffLoginRes.body.data.token;

        // Seed basic entities
        service = await prisma.service.create({
            data: { tenantId: tenant.id, name: 'Test Service', durationMinutes: 60, price: 100 }
        });

        staffMem = await prisma.staff.create({
            data: { tenantId: tenant.id, name: 'Test Staff', email: 'staff1@report.com' }
        });

        customer = await prisma.customer.create({
            data: { tenantId: tenant.id, name: 'Test Customer', email: 'cust@report.com' }
        });

        const now = new Date();

        // Seed Appointments
        await prisma.appointment.createMany({
            data: [
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-1',
                    startTimeUtc: startOfDay(now),
                    endTimeUtc: endOfDay(now),
                    status: AppointmentStatus.COMPLETED,
                    createdAt: now
                },
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-2',
                    startTimeUtc: startOfDay(now),
                    endTimeUtc: endOfDay(now),
                    status: AppointmentStatus.NO_SHOW,
                    createdAt: now
                },
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-3',
                    startTimeUtc: startOfDay(now),
                    endTimeUtc: endOfDay(now),
                    status: AppointmentStatus.CANCELLED,
                    createdAt: now
                },
                // Archival candidates (13 months old)
                {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: staffMem.id,
                    customerId: customer.id,
                    referenceId: 'BK-ARCH-1',
                    startTimeUtc: subMonths(now, 13),
                    endTimeUtc: subMonths(now, 13),
                    status: AppointmentStatus.COMPLETED,
                    createdAt: subMonths(now, 13)
                }
            ]
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('Reports API', () => {
        const from = '2000-01-01';
        const to = '2099-12-31';

        it('should block non-admins from reports', async () => {
            const res = await request(app)
                .get(`/api/reports/summary?from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffToken}`); // Staff Token
            expect(res.status).toBe(403);
        });

        it('should return summary for admin', async () => {
            const res = await request(app)
                .get(`/api/reports/summary?from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalAppointments).toBe(4);
            expect(res.body.data.completedCount).toBe(2); // 1 now + 1 from 13 mos ago
            expect(res.body.data.noShowCount).toBe(1);
            expect(res.body.data.noShowRate).toBe(25); // 1 / 4 * 100
            expect(res.body.data.bookingsByService.length).toBe(1);
        });

        it('should return export csv', async () => {
            const res = await request(app)
                .get(`/api/reports/export?type=appointments&from=${from}&to=${to}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.text).toContain('BK-1');
            expect(res.text).toContain('BK-2');
            expect(res.text).toContain('NO_SHOW');
        });
    });

    describe('Archival Job', () => {
        it('should move appointments older than 12 months to archive', async () => {
            // Initially, there are 4 in appointment table
            const beforeCount = await prisma.appointment.count({ where: { tenantId: tenant.id } });
            expect(beforeCount).toBe(4);

            const beforeArchive = await prisma.appointmentArchive.count({ where: { tenantId: tenant.id } });
            expect(beforeArchive).toBe(0);

            // Run archival job manually
            await archivalJob.runArchivalProcess();

            // After, the 13-month old one should be moved
            const afterCount = await prisma.appointment.count({ where: { tenantId: tenant.id } });
            expect(afterCount).toBe(3);

            const afterArchive = await prisma.appointmentArchive.count({ where: { tenantId: tenant.id } });
            expect(afterArchive).toBe(1);

            const archiveRecord = await prisma.appointmentArchive.findFirst({ where: { tenantId: tenant.id } });
            expect(archiveRecord?.referenceId).toBe('BK-ARCH-1');
        });

        it('should allow querying archives via API', async () => {
            // Standard query returns 3
            const res1 = await request(app)
                .get('/api/appointments?limit=10')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            // DEBUG LOGS
            if (res1.status !== 200) console.log('RES1 ERR:', res1.body);
            expect(res1.status).toBe(200);
            expect(res1.body.total).toBe(3);

            // Archive query returns 1
            const res2 = await request(app)
                .get('/api/appointments?isArchived=true&limit=10')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            if (res2.status !== 200) console.log('RES2 ERR:', res2.body);
            expect(res2.status).toBe(200);
            expect(res2.body.total).toBe(1);
            expect(res2.body.items[0].referenceId).toBe('BK-ARCH-1');
        });
    });
});
