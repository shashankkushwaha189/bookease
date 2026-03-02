import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Consent Capture Module', () => {
    let tenantA: any;
    let serviceId: string;
    let staffId: string;

    beforeAll(async () => {
        await cleanupDatabase();

        tenantA = await prisma.tenant.create({
            data: {
                name: 'Consent Tenant',
                slug: 'consent-test-tenant',
                timezone: 'UTC',
            },
        });

        const service = await prisma.service.create({
            data: {
                tenantId: tenantA.id,
                name: 'Consent Service',
                durationMinutes: 30,
            }
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                tenantId: tenantA.id,
                name: 'Consent Staff',
                email: 'consent-staff@example.com',
            }
        });
        staffId = staff.id;

        await prisma.businessProfile.create({
            data: {
                tenantId: tenantA.id,
                businessName: 'Consent Clinic',
                policyText: 'Our custom policy v1',
            },
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('should reject booking without consent flag', async () => {
        const response = await request(app)
            .post('/api/public/bookings/book')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'John Doe',
                    email: 'customer@example.com',
                    phone: '1234567890'
                },
                startTimeUtc: new Date(Date.now() + 3600000).toISOString(),
                endTimeUtc: new Date(Date.now() + 5400000).toISOString(),
                sessionToken: 'test-token',
                consentGiven: false,
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('should create consent record on successful booking', async () => {
        const customerEmail = 'tester@example.com';
        const response = await request(app)
            .post('/api/public/bookings/book')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'Test User',
                    email: customerEmail,
                    phone: '1234567890'
                },
                startTimeUtc: new Date(Date.now() + 7200000).toISOString(),
                endTimeUtc: new Date(Date.now() + 9000000).toISOString(),
                sessionToken: 'test-token-2',
                consentGiven: true,
            });

        expect(response.status).toBe(201);

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
            .post('/api/public/bookings/book')
            .set('X-Tenant-ID', tenantA.id)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'Hist User',
                    email: customerEmail,
                    phone: '1234567890'
                },
                startTimeUtc: new Date(Date.now() + 10800000).toISOString(),
                endTimeUtc: new Date(Date.now() + 12600000).toISOString(),
                sessionToken: 'test-token-3',
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
