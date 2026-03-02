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
(0, vitest_1.describe)('Staff Module', () => {
    let tenantA;
    let tenantB;
    let adminTokenA;
    let serviceIdA;
    let serviceIdB;
    let staffId;
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
        // Create services
        const serviceA = await prisma_1.prisma.service.create({
            data: { name: 'Service A', durationMinutes: 30, tenantId: tenantA.id }
        });
        serviceIdA = serviceA.id;
        const serviceB = await prisma_1.prisma.service.create({
            data: { name: 'Service B', durationMinutes: 60, tenantId: tenantB.id }
        });
        serviceIdB = serviceB.id;
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
    (0, vitest_1.describe)('POST /api/staff', () => {
        (0, vitest_1.it)('should create a staff member', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post('/api/staff')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                name: 'John Doe',
                email: 'john@example.com',
                bio: 'Senior Stylist'
            });
            (0, vitest_1.expect)(response.status).toBe(201);
            (0, vitest_1.expect)(response.body.data.name).toBe('John Doe');
            staffId = response.body.data.id;
        });
    });
    (0, vitest_1.describe)('POST /api/staff/:id/services', () => {
        (0, vitest_1.it)('should assign services to staff', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post(`/api/staff/${staffId}/services`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                serviceIds: [serviceIdA]
            });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.staffServices.length).toBe(1);
        });
        (0, vitest_1.it)('should reject services from another tenant', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .post(`/api/staff/${staffId}/services`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                serviceIds: [serviceIdB]
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.error.message).toContain('One or more services do not belong to this tenant');
        });
    });
    (0, vitest_1.describe)('PUT /api/staff/:id/schedule', () => {
        (0, vitest_1.it)('should set weekly working hours with valid breaks', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                schedules: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [
                            { startTime: '12:00', endTime: '13:00' }
                        ]
                    }
                ]
            });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.weeklySchedule.length).toBe(1);
        });
        (0, vitest_1.it)('should reject break outside working hours', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                schedules: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [
                            { startTime: '08:00', endTime: '10:00' }
                        ]
                    }
                ]
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.error.message).toContain('must be within working hours');
        });
        (0, vitest_1.it)('should reject overlapping breaks', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                schedules: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [
                            { startTime: '12:00', endTime: '13:00' },
                            { startTime: '12:30', endTime: '13:30' }
                        ]
                    }
                ]
            });
            (0, vitest_1.expect)(response.status).toBe(400);
            (0, vitest_1.expect)(response.body.error.message).toBe('Breaks cannot overlap');
        });
    });
    (0, vitest_1.describe)('POST /api/staff/:id/time-off', () => {
        (0, vitest_1.it)('should block off dates', async () => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            const response = await (0, supertest_1.default)(app_1.app)
                .post(`/api/staff/${staffId}/time-off`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                date: date.toISOString(),
                reason: 'Holiday'
            });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data.timeOffs.length).toBe(1);
        });
    });
    (0, vitest_1.describe)('GET /api/public/staff', () => {
        (0, vitest_1.it)('should list limited staff info publicly', async () => {
            const response = await (0, supertest_1.default)(app_1.app)
                .get('/api/public/staff')
                .set('X-Tenant-ID', tenantA.id);
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data[0]).toHaveProperty('name');
            (0, vitest_1.expect)(response.body.data[0]).toHaveProperty('photoUrl');
            (0, vitest_1.expect)(response.body.data[0]).toHaveProperty('services');
            (0, vitest_1.expect)(response.body.data[0]).not.toHaveProperty('email');
            (0, vitest_1.expect)(response.body.data[0]).not.toHaveProperty('weeklySchedule');
        });
    });
});
