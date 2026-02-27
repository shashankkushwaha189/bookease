import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Consent Capture Module', () => {
    let tenantA: any;

    beforeAll(async () => {
        // Cleanup
        await prisma.consentRecord.deleteMany();
        await prisma.businessProfile.deleteMany();
        await prisma.tenant.deleteMany();

        tenantA = await prisma.tenant.create({
            data: {
                name: 'Consent Tenant',
                slug: 'consent-test-tenant',
                timezone: 'UTC',
            },
        });

        await prisma.businessProfile.create({
            data: {
                tenantId: tenantA.id,
                businessName: 'Consent Clinic',
                policyText: 'Our custom policy v1',
            },
        });
    });

    afterAll(async () => {
        await prisma.consentRecord.deleteMany();
        await prisma.businessProfile.deleteMany();
        await prisma.tenant.deleteMany();
    });

    it('should reject booking without consent flag', async () => {
        const response = await request(app)
            .post('/api/public/bookings')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                customerEmail: 'customer@example.com',
                customerName: 'John Doe',
                startTime: new Date().toISOString(),
                serviceId: '00000000-0000-0000-0000-000000000000',
                consentGiven: false,
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('should create consent record on successful booking', async () => {
        const customerEmail = 'tester@example.com';
        const response = await request(app)
            .post('/api/public/bookings')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                customerEmail,
                customerName: 'Test User',
                startTime: new Date().toISOString(),
                serviceId: '00000000-0000-0000-0000-000000000000',
                consentGiven: true,
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        // Verify record in DB
        const records = await prisma.consentRecord.findMany({
            where: {
                tenantId: tenantA.id,
                customerEmail,
            },
        });

        expect(records.length).toBe(1);
        expect(records[0].consentText).toBe('Our custom policy v1');
        expect(records[0].ipAddress).toBeDefined();
    });

    it('should snapshot the historical policy text even if profile changes later', async () => {
        const customerEmail = 'historical@example.com';

        // 1. Give consent with current policy
        await request(app)
            .post('/api/public/bookings')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                customerEmail,
                customerName: 'Hist User',
                startTime: new Date().toISOString(),
                serviceId: '00000000-0000-0000-0000-000000000000',
                consentGiven: true,
            });

        // 2. Change policy in profile
        await prisma.businessProfile.update({
            where: { tenantId: tenantA.id },
            data: { policyText: 'New policy v2' },
        });

        // 3. Verify record still has v1
        const records = await prisma.consentRecord.findMany({
            where: { customerEmail },
        });

        expect(records[0].consentText).toBe('Our custom policy v1');
    });
});
