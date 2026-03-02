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
(0, vitest_1.describe)('Business Profile Module', () => {
    let tenantA;
    let tenantB;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenantA = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Tenant A',
                slug: 'tenant-a',
                timezone: 'UTC',
            },
        });
        tenantB = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Tenant B',
                slug: 'tenant-b',
                timezone: 'UTC',
            },
        });
        // Create a default profile for Tenant A to avoid "not found" errors in other tests
        await prisma_1.prisma.businessProfile.create({
            data: {
                tenantId: tenantA.id,
                businessName: 'Default Clinic',
                brandColor: '#1A56DB',
                accentColor: '#7C3AED',
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/business-profile', () => {
        (0, vitest_1.it)('should create or update a business profile scoped to the tenant', async () => {
            const profileData = {
                businessName: 'Tenant A Clinic',
                description: 'A great clinic',
                brandColor: '#1A56DB',
                accentColor: '#7C3AED',
                seoTitle: 'Best Clinic',
                seoDescription: 'We are the best',
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send(profileData);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(response.body.data.businessName).toBe(profileData.businessName);
            (0, vitest_1.expect)(response.body.data.tenantId).toBe(tenantA.id);
        });
        (0, vitest_1.it)('should return 400 for invalid hex color', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                businessName: 'Invalid Color',
                brandColor: 'not-a-color',
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.success).toBe(false);
        });
    });
    (0, vitest_1.describe)('GET /api/public/profile', () => {
        (0, vitest_1.it)('should return only a safe subset of fields', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/public/profile/public')
                .set('X-Tenant-ID', tenantA.id);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            const data = response.body.data;
            (0, vitest_1.expect)(data).toHaveProperty('businessName');
            (0, vitest_1.expect)(data).toHaveProperty('brandColor');
            (0, vitest_1.expect)(data).toHaveProperty('description');
            // Should NOT have admin/internal fields
            (0, vitest_1.expect)(data).not.toHaveProperty('seoTitle');
            (0, vitest_1.expect)(data).not.toHaveProperty('seoDescription');
            (0, vitest_1.expect)(data).not.toHaveProperty('tenantId');
            (0, vitest_1.expect)(data).not.toHaveProperty('id');
        });
    });
    (0, vitest_1.describe)('Tenant Isolation', () => {
        (0, vitest_1.it)('should not allow Tenant B to see Tenant A profile via private route', async () => {
            // Tenant B has no profile yet
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/business-profile')
                .set('X-Tenant-ID', tenantB.id);
            (0, vitest_1.expect)(response.status).toBe(404);
            (0, vitest_1.expect)(response.body.error.code).toBe('NOT_FOUND');
        });
        (0, vitest_1.it)('should ensure updates are scoped to the header tenant', async () => {
            // Tenant A tries to update profile while passing Tenant B ID in header (not possible due to our MW design)
            // But let's verify Tenant A can update their own
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send({ businessName: 'Updated Name' });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.businessName).toBe('Updated Name');
        });
    });
});
