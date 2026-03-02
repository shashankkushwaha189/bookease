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
const config_schema_1 = require("../src/modules/config/config.schema");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('Configuration Engine', () => {
    let tenantId;
    let adminToken;
    let staffToken;
    const password = 'Password@123';
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        const tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: 'test-tenant',
            },
        });
        tenantId = tenant.id;
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const adminUser = await prisma_1.prisma.user.create({
            data: {
                email: 'admin@test.com',
                passwordHash,
                role: 'ADMIN',
                tenantId,
            },
        });
        const staffUser = await prisma_1.prisma.user.create({
            data: {
                email: 'staff@test.com',
                passwordHash,
                role: 'STAFF',
                tenantId,
            },
        });
        // Login to get tokens
        const adminLogin = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'admin@test.com', password });
        adminToken = adminLogin.body.data.token;
        const staffLogin = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'staff@test.com', password });
        staffToken = staffLogin.body.data.token;
    });
    (0, vitest_1.afterAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('GET /api/config/current', () => {
        (0, vitest_1.it)('should return default config if none set', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data).toEqual(config_schema_1.DEFAULT_CONFIG);
        });
        (0, vitest_1.it)('should be blocked for staff users', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`);
            (0, vitest_1.expect)(response.status).toBe(403);
        });
    });
    (0, vitest_1.describe)('POST /api/config', () => {
        (0, vitest_1.it)('should save new config and increment version', async () => {
            const newConfig = {
                ...config_schema_1.DEFAULT_CONFIG,
                booking: { ...config_schema_1.DEFAULT_CONFIG.booking, maxBookingsPerDay: 100 }
            };
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                config: newConfig,
                note: 'Increased bookings'
            });
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body.data.version).toBe(1);
            (0, vitest_1.expect)(response.body.data.config.booking.maxBookingsPerDay).toBe(100);
            // Fetch current to verify
            const currentRes = await (0, supertest_1.default)(app_1.app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(currentRes.body.data.booking.maxBookingsPerDay).toBe(100);
        });
        (0, vitest_1.it)('should reject invalid config shape', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                config: { booking: { maxBookingsPerDay: -1 } } // Invalid
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
    (0, vitest_1.describe)('Rollback', () => {
        (0, vitest_1.it)('should rollback to a previous version', async () => {
            // 1. Current is version 1 (100 bookings)
            // 2. Save version 2 (200 bookings)
            const v2Config = {
                ...config_schema_1.DEFAULT_CONFIG,
                booking: { ...config_schema_1.DEFAULT_CONFIG.booking, maxBookingsPerDay: 200 }
            };
            await (0, supertest_1.default)(app_1.app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ config: v2Config });
            // 3. Rollback to version 1
            const rollbackRes = await (0, supertest_1.default)(app_1.app)
                .post('/api/config/rollback/1')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(rollbackRes.status).toBe(201);
            (0, vitest_1.expect)(rollbackRes.body.data.version).toBe(3);
            (0, vitest_1.expect)(rollbackRes.body.data.config.booking.maxBookingsPerDay).toBe(100);
        });
    });
    (0, vitest_1.describe)('Performance & Caching', () => {
        (0, vitest_1.it)('should return under 50ms on cache hit', async () => {
            // First hit to prime cache
            await (0, supertest_1.default)(app_1.app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            const start = Date.now();
            await (0, supertest_1.default)(app_1.app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            const duration = Date.now() - start;
            (0, vitest_1.expect)(duration).toBeLessThan(50);
        });
    });
});
