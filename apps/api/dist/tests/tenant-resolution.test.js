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
(0, vitest_1.describe)('Tenant Resolution Middleware', () => {
    let tenantA;
    let tenantB;
    let inactiveTenant;
    (0, vitest_1.beforeAll)(async () => {
        // Cleanup
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
        inactiveTenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Inactive Tenant',
                slug: 'inactive',
                timezone: 'UTC',
                isActive: false,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.it)('should return 403 if X-Tenant-ID header is missing', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/api/public/services');
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.error.code).toBe('TENANT_ID_REQUIRED');
    });
    (0, vitest_1.it)('should return 403 if tenant does not exist', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .get('/api/public/services')
            .set('X-Tenant-ID', '00000000-0000-0000-0000-000000000000');
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
    (0, vitest_1.it)('should return 403 if tenant is inactive', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .get('/api/public/services')
            .set('X-Tenant-ID', inactiveTenant.id);
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.error.code).toBe('TENANT_INACTIVE');
    });
    (0, vitest_1.it)('should return 200 if tenant ID is valid and active', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .get('/api/public/services')
            .set('X-Tenant-ID', tenantA.id);
        // The endpoint exists and we have a valid tenant ID
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(response.body.data)).toBe(true);
    });
    (0, vitest_1.it)('should allow /health without X-Tenant-ID', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.status).toBe('ok');
    });
});
