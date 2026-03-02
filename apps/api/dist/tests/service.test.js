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
(0, vitest_1.describe)('Services Module', () => {
    let tenantA;
    let tenantB;
    let adminTokenA;
    let serviceId;
    const password = 'Password@123';
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenantA = await prisma_1.prisma.tenant.create({
            data: { name: 'Tenant A', slug: 'tenant-a' },
        });
        tenantB = await prisma_1.prisma.tenant.create({
            data: { name: 'Tenant B', slug: 'tenant-b' },
        });
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        await prisma_1.prisma.user.create({
            data: {
                email: 'admin@tenant-a.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenantA.id,
            },
        });
        // Login to get token
        const login = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantA.id)
            .send({ email: 'admin@tenant-a.com', password });
        adminTokenA = login.body.data.token;
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/services', () => {
        (0, vitest_1.it)('should create a service with valid data', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                name: 'Checkup',
                durationMinutes: 30,
                bufferBefore: 5,
                bufferAfter: 5,
                price: 50
            });
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body.data.name).toBe('Checkup');
            serviceId = response.body.data.id;
        });
        (0, vitest_1.it)('should reject negative duration', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                name: 'Invalid Service',
                durationMinutes: -10
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.error.code).toBe('VALIDATION_ERROR');
        });
        (0, vitest_1.it)('should reject duplicate names in same tenant', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                name: 'Checkup',
                durationMinutes: 45
            });
            (0, vitest_1.expect)(response.status).toBe(409);
        });
    });
    (0, vitest_1.describe)('GET /api/public/services', () => {
        (0, vitest_1.it)('should list only active services for the tenant', async () => {
            // Create another service and make it inactive
            await prisma_1.prisma.service.create({
                data: {
                    name: 'Hidden Service',
                    durationMinutes: 60,
                    tenantId: tenantA.id,
                    isActive: false
                }
            });
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantA.id);
            (0, vitest_1.expect)(response.status).toBe(200);
            const services = response.body.data;
            (0, vitest_1.expect)(services.some((s) => s.name === 'Checkup')).toBe(true);
            (0, vitest_1.expect)(services.some((s) => s.name === 'Hidden Service')).toBe(false);
        });
        (0, vitest_1.it)('should respect tenant isolation', async () => {
            // Tenant B should see 0 services
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantB.id);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('DELETE /api/services/:id', () => {
        (0, vitest_1.it)('should soft delete the service', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .delete(`/api/services/${serviceId}`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`);
            (0, vitest_1.expect)(response.status).toBe(200);
            // Verify it's inactive in public list
            const publicRes = await (0, supertest_1.default)(app_1.app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantA.id);
            (0, vitest_1.expect)(publicRes.body.data.some((s) => s.id === serviceId)).toBe(false);
            // Verify it's still in DB but inactive
            const dbService = await prisma_1.prisma.service.findUnique({ where: { id: serviceId } });
            (0, vitest_1.expect)(dbService?.isActive).toBe(false);
        });
    });
});
