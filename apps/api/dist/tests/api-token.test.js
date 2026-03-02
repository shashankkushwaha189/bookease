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
const express_1 = __importDefault(require("express"));
const helpers_1 = require("./helpers");
const client_1 = require("../src/generated/client");
const api_key_middleware_1 = require("../src/middleware/api-key.middleware");
(0, vitest_1.describe)('API Tokens Module', () => {
    let tenant;
    let adminToken;
    let staffToken;
    let createdPlainToken;
    let createdTokenId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        tenant = await prisma_1.prisma.tenant.create({
            data: { name: 'Token Tenant', slug: 'token-tenant', timezone: 'UTC' },
        });
        const passwordHash = await bcrypt_1.default.hash('Password@123', 10);
        await prisma_1.prisma.user.create({
            data: { email: 'admin@token.com', passwordHash, role: client_1.UserRole.ADMIN, tenantId: tenant.id },
        });
        await prisma_1.prisma.user.create({
            data: { email: 'staff@token.com', passwordHash, role: client_1.UserRole.STAFF, tenantId: tenant.id },
        });
        const adminLoginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@token.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;
        const staffLoginRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'staff@token.com', password: 'Password@123' });
        staffToken = staffLoginRes.body.data.token;
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/tokens', () => {
        (0, vitest_1.it)('should NOT allow staff to create tokens', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ name: 'Integration A' });
            (0, vitest_1.expect)(res.status).toBe(403);
        });
        (0, vitest_1.it)('should allow admin to create a token', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Integration A' });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.token).toBeDefined();
            createdPlainToken = res.body.data.token;
            createdTokenId = res.body.data.id;
        });
    });
    (0, vitest_1.describe)('API Key Authentication Middleware', () => {
        // Let's create a dummy protected route temporarily to test the middleware if it's not bound yet.
        // Actually, we can just hit /api/audit (which requires auth) or we map a test route
        const mockApp = (0, express_1.default)();
        mockApp.use(express_1.default.json());
        mockApp.use(api_key_middleware_1.apiKeyMiddleware);
        mockApp.use(api_key_middleware_1.apiKeyRateLimiter);
        mockApp.get('/test-route', (req, res) => res.json({ success: true, user: req.user, tenantId: req.tenantId }));
        (0, vitest_1.it)('should authenticate correctly with a valid API token', async () => {
            const res = await (0, supertest_1.default)(mockApp)
                .get('/test-route')
                .set('X-API-Key', createdPlainToken);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.tenantId).toBe(tenant.id);
            (0, vitest_1.expect)(res.body.user.role).toBe('API');
        });
        (0, vitest_1.it)('should reject requests with missing API Token', async () => {
            const res = await (0, supertest_1.default)(mockApp)
                .get('/test-route');
            (0, vitest_1.expect)(res.status).toBe(401);
        });
        (0, vitest_1.it)('should reject requests with invalid secret API Token', async () => {
            const res = await (0, supertest_1.default)(mockApp)
                .get('/test-route')
                .set('X-API-Key', `${createdTokenId}.invalidsecret1234`); // Matching ID but wrong secret
            (0, vitest_1.expect)(res.status).toBe(401);
        });
    });
    (0, vitest_1.describe)('DELETE /api/tokens/:id', () => {
        (0, vitest_1.it)('should revoke the token', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .delete(`/api/tokens/${createdTokenId}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
        });
        (0, vitest_1.it)('should fail authentication after revocation', async () => {
            const mockAppRevoked = (0, express_1.default)();
            mockAppRevoked.use(express_1.default.json());
            mockAppRevoked.use(api_key_middleware_1.apiKeyMiddleware);
            mockAppRevoked.get('/test-route', (req, res) => res.json({ success: true }));
            const res = await (0, supertest_1.default)(mockAppRevoked)
                .get('/test-route')
                .set('X-API-Key', createdPlainToken);
            // Using the previously valid plainToken
            (0, vitest_1.expect)(res.status).toBe(401);
            (0, vitest_1.expect)(res.body.error.message).toBe('Invalid or revoked API Key');
        });
    });
});
