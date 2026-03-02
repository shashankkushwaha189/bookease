"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('Tenant Module', () => {
    const testTenant = {
        name: 'Test Clinic',
        slug: 'test-clinic',
    };
    let tenantId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.it)('POST /api/tenants should create a tenant', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .post('/api/tenants')
            .send(testTenant);
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.name).toBe(testTenant.name);
        (0, vitest_1.expect)(response.body.data.slug).toBe(testTenant.slug);
        (0, vitest_1.expect)(response.body.data.id).toBeDefined();
        tenantId = response.body.data.id;
    });
    (0, vitest_1.it)('POST /api/tenants should return 409 for duplicate slug', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .post('/api/tenants')
            .send(testTenant);
        (0, vitest_1.expect)(response.status).toBe(409);
        (0, vitest_1.expect)(response.body.success).toBe(false);
        (0, vitest_1.expect)(response.body.error.code).toBe('CONFLICT');
    });
    (0, vitest_1.it)('GET /api/tenants/:id should return the tenant', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get(`/api/tenants/${tenantId}`);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.id).toBe(tenantId);
    });
    (0, vitest_1.it)('DELETE /api/tenants/:id should soft delete the tenant', async () => {
        const response = await (0, supertest_1.default)(app_1.app).delete(`/api/tenants/${tenantId}`);
        (0, vitest_1.expect)(response.status).toBe(204);
        // Verify it's gone from normal GET
        const getResponse = await (0, supertest_1.default)(app_1.app).get(`/api/tenants/${tenantId}`);
        (0, vitest_1.expect)(getResponse.status).toBe(404);
    });
});
