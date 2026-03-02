"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('Consent Capture Module', () => {
    let tenantA;
    let serviceId;
    let staffId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenantA = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Consent Tenant',
                slug: 'consent-test-tenant',
                timezone: 'UTC',
            },
        });
        const service = await prisma_1.prisma.service.create({
            data: {
                tenantId: tenantA.id,
                name: 'Consent Service',
                durationMinutes: 30,
            }
        });
        serviceId = service.id;
        const staff = await prisma_1.prisma.staff.create({
            data: {
                tenantId: tenantA.id,
                name: 'Consent Staff',
                email: 'consent-staff@example.com',
            }
        });
        staffId = staff.id;
        await prisma_1.prisma.businessProfile.create({
            data: {
                tenantId: tenantA.id,
                businessName: 'Consent Clinic',
                policyText: 'Our custom policy v1',
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.it)('should reject booking without consent flag', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
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
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
    (0, vitest_1.it)('should create consent record on successful booking', async () => {
        const customerEmail = 'tester@example.com';
        const response = await (0, supertest_1.default)(app_1.app)
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
        (0, vitest_1.expect)(response.status).toBe(201);
        // Verify record in DB
        const records = await prisma_1.prisma.consentRecord.findMany({
            where: {
                tenantId: tenantA.id,
                customerEmail,
            },
        });
        (0, vitest_1.expect)(records.length).toBe(1);
        (0, vitest_1.expect)(records[0].consentText).toBe('Our custom policy v1');
        (0, vitest_1.expect)(records[0].ipAddress).toBeDefined();
    });
    (0, vitest_1.it)('should snapshot the historical policy text even if profile changes later', async () => {
        const customerEmail = 'historical@example.com';
        // 1. Give consent with current policy
        await (0, supertest_1.default)(app_1.app)
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
        await prisma_1.prisma.businessProfile.update({
            where: { tenantId: tenantA.id },
            data: { policyText: 'New policy v2' },
        });
        // 3. Verify record still has v1
        const records = await prisma_1.prisma.consentRecord.findMany({
            where: { customerEmail },
        });
        (0, vitest_1.expect)(records[0].consentText).toBe('Our custom policy v1');
    });
});
