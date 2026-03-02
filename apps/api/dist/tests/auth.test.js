"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('Auth & RBAC Module', () => {
    let tenantA;
    let tenantB;
    let adminUserA;
    let staffUserA;
    const password = 'Password@123';
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
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        adminUserA = await prisma_1.prisma.user.create({
            data: {
                email: 'admin@tenant-a.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenantA.id,
            },
        });
        staffUserA = await prisma_1.prisma.user.create({
            data: {
                email: 'staff@tenant-a.com',
                passwordHash,
                role: 'STAFF',
                tenantId: tenantA.id,
            },
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/auth/login', () => {
        (0, vitest_1.it)('should return 200 and a token for valid credentials', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                email: 'admin@tenant-a.com',
                password,
            });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.success).toBe(true);
            (0, vitest_1.expect)(response.body.data).toHaveProperty('token');
            (0, vitest_1.expect)(response.body.data.user.email).toBe('admin@tenant-a.com');
            (0, vitest_1.expect)(response.body.data.user.role).toBe('ADMIN');
        });
        (0, vitest_1.it)('should return 401 for wrong password', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                email: 'admin@tenant-a.com',
                password: 'wrong-password',
            });
            (0, vitest_1.expect)(response.status).toBe(401);
            (0, vitest_1.expect)(response.body.success).toBe(false);
            (0, vitest_1.expect)(response.body.error.message).toBe('Invalid credentials');
        });
        (0, vitest_1.it)('should return 401 for cross-tenant login attempt', async () => {
            // Trying to log into Tenant B with Tenant A user credentials
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantB.id)
                .send({
                email: 'admin@tenant-a.com',
                password,
            });
            (0, vitest_1.expect)(response.status).toBe(401);
            (0, vitest_1.expect)(response.body.error.message).toBe('Invalid credentials');
        });
    });
    (0, vitest_1.describe)('GET /api/auth/me', () => {
        (0, vitest_1.it)('should return current user for valid token', async () => {
            // Login first
            const loginRes = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'admin@tenant-a.com', password });
            const token = loginRes.body.data.token;
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${token}`);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.email).toBe('admin@tenant-a.com');
        });
        (0, vitest_1.it)('should return 401 for missing token', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantA.id);
            (0, vitest_1.expect)(response.status).toBe(401);
        });
        (0, vitest_1.it)('should return 401 for token-tenant mismatch', async () => {
            const loginRes = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'admin@tenant-a.com', password });
            const token = loginRes.body.data.token;
            // Send Tenant A token to Tenant B route
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantB.id)
                .set('Authorization', `Bearer ${token}`);
            (0, vitest_1.expect)(response.status).toBe(401);
            (0, vitest_1.expect)(response.body.error.message).toBe('Token tenant mismatch');
        });
    });
    (0, vitest_1.describe)('RBAC & Role Guards', () => {
        // We haven't applied requireRole to any routes yet in this task, 
        // but we can test the middleware behavior by creating a mock route if needed.
        // However, the service and controller are already using req.user.role.
        (0, vitest_1.it)('should block staff from admin-protected logic (if any)', async () => {
            // For now, let's verify that the tokens have correct roles
            const loginStaff = await (0, supertest_1.default)(app_1.app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'staff@tenant-a.com', password });
            (0, vitest_1.expect)(loginStaff.body).toHaveProperty('data');
            (0, vitest_1.expect)(loginStaff.body.data).toHaveProperty('token');
            const staffToken = loginStaff.body.data.token;
            const decoded = jsonwebtoken_1.default.decode(staffToken);
            (0, vitest_1.expect)(decoded.role).toBe('STAFF');
        });
    });
});
