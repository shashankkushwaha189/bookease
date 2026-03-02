import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './helpers';
import { UserRole } from '../src/generated/client';

describe('CSV Import Module', () => {
    let tenant: any;
    let adminToken: string;

    beforeAll(async () => {
        await cleanupDatabase();

        tenant = await prisma.tenant.create({
            data: { name: 'Import Tenant', slug: 'import-tenant', timezone: 'UTC' },
        });

        const passwordHash = await bcrypt.hash('Password@123', 10);

        await prisma.user.create({
            data: { email: 'admin@import.com', passwordHash, role: UserRole.ADMIN, tenantId: tenant.id },
        });

        const adminLoginRes = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@import.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('POST /api/import/customers', () => {
        it('should successfully import valid customers and return structured validation errors for bad rows', async () => {
            const csvContent = [
                'name,email,phone,tags',
                'Alice Cooper,alice@test.com,1234567890,"VIP, New"',
                ',bademail@bad.com,111,',  // Missing name
                'Bob Builder,notanemail,000,Retail' // Invalid email
            ].join('\n');

            const res = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'customers.csv');

            // Expecting 200 HTTP, but partial success logically
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const { imported, failed, errors } = res.body.data;
            expect(imported).toBe(1);  // Alice Cooper
            expect(failed).toBe(2);    // Missing name row, Invalid email row

            // Validate that Alice made it into the database
            const alice = await prisma.customer.findFirst({ where: { email: 'alice@test.com' } });
            expect(alice).toBeDefined();
            expect(alice?.name).toBe('Alice Cooper');

            // Validate error structure
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e: any) => e.row === 2 && e.field === 'name')).toBe(true);
            expect(errors.some((e: any) => e.row === 3 && e.field === 'email')).toBe(true);
        });

        it('should enforce max 5MB file upload limit', async () => {
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

            const res = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', largeBuffer, 'huge.csv');

            // Mutler 5MB Limit violation
            expect(res.status).toBe(413); // Payload Too Large
        });

        it('should require ADMIN role to import', async () => {
            // First create a staff
            const staffPwd = await bcrypt.hash('Staff@123', 10);
            await prisma.user.create({
                data: { email: 'staff@import.com', passwordHash: staffPwd, role: UserRole.STAFF, tenantId: tenant.id },
            });

            const staffLogin = await request(app).post('/api/auth/login').set('X-Tenant-ID', tenant.id).send({ email: 'staff@import.com', password: 'Staff@123' });

            const res = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffLogin.body.data.token}`)
                .attach('file', Buffer.from('name,email\nTest,test@test.com'), 'test.csv');

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/import/services', () => {
        it('should map numeric columns and defaults appropriately', async () => {
            const csvContent = [
                'name,durationMinutes,price,bufferBefore,bufferAfter',
                'Haircut,60,50,0,15',     // Valid completely specified
                'Consultation,,0,0,0',    // Invalid: duration needed
                'Quick Wash,15,',         // Valid: missing numerics coerce or default via zod
            ].join('\n');

            const res = await request(app)
                .post('/api/import/services')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'services.csv');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            console.log(JSON.stringify(res.body, null, 2));

            const { imported, failed } = res.body.data;
            expect(imported).toBe(2);
            expect(failed).toBe(1);

            const quickWash = await prisma.service.findFirst({ where: { name: 'Quick Wash' } });
            expect(quickWash).toBeDefined();
            // Checking the zod default logic 
            expect(Number(quickWash?.price)).toBe(0);
        });
    });

    describe('POST /api/import/staff', () => {
        it('should parse assignedServices logic dynamically', async () => {
            // First we need the service existing to map to
            await prisma.service.create({
                data: { tenantId: tenant.id, name: 'Massage', durationMinutes: 60, price: 100 }
            });

            const csvContent = [
                'name,email,assignedServices',
                'Sarah Smith,sarah@test.com,"Massage, FakeService"',
            ].join('\n');

            const res = await request(app)
                .post('/api/import/staff')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', Buffer.from(csvContent), 'staff.csv');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data.imported).toBe(1);

            // Let's verify Sarah exists with the relation to `Massage`
            const sarah = await prisma.staff.findFirst({
                where: { email: 'sarah@test.com' },
                include: { staffServices: { include: { service: true } } }
            });

            expect(sarah).toBeDefined();
            expect(sarah?.staffServices.length).toBe(1);
            expect(sarah?.staffServices[0].service.name).toBe('Massage');
        });
    });
});
