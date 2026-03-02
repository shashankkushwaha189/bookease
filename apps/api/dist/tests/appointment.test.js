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
(0, vitest_1.describe)('Appointment Engine Integration', () => {
    let tenantId;
    let serviceId;
    let staffId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        // Setup seed data
        const tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Test Clinic',
                slug: `test-clinic-${Date.now()}`,
                timezone: 'UTC',
            }
        });
        tenantId = tenant.id;
        const service = await prisma_1.prisma.service.create({
            data: {
                tenantId,
                name: 'Consultation',
                durationMinutes: 30,
            }
        });
        serviceId = service.id;
        const staff = await prisma_1.prisma.staff.create({
            data: {
                tenantId,
                name: 'Dr. Smith',
                email: 'smith@example.com',
            }
        });
        staffId = staff.id;
    });
    (0, vitest_1.it)('should create a slot lock and then book an appointment', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0); // Tomorrow at 00:00
        const endTimeUtc = new Date(startTimeUtc);
        endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);
        // 1. Create Lock
        const lockRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
            staffId,
            startTimeUtc: startTimeUtc.toISOString(),
            endTimeUtc: endTimeUtc.toISOString(),
            sessionToken: 'test-session-123'
        });
        (0, vitest_1.expect)(lockRes.status).toBe(201);
        const lock = lockRes.body;
        // 2. Create Booking using the lock
        const bookingRes = await (0, supertest_1.default)(app_1.app)
            .post('/api/public/bookings/book')
            .set('x-tenant-id', tenantId)
            .send({
            serviceId,
            staffId,
            customer: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890'
            },
            startTimeUtc: startTimeUtc.toISOString(),
            endTimeUtc: endTimeUtc.toISOString(),
            sessionToken: 'test-session-123',
            consentGiven: true
        });
        (0, vitest_1.expect)(bookingRes.status).toBe(201);
        (0, vitest_1.expect)(bookingRes.body).toBeDefined();
        (0, vitest_1.expect)(bookingRes.body.referenceId).toMatch(/^BK-\d{4}-\d{5}$/);
    });
    (0, vitest_1.it)('should reject a second lock on the same slot', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 48, 0, 0, 0);
        const endTimeUtc = new Date(startTimeUtc);
        endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);
        await (0, supertest_1.default)(app_1.app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
            staffId,
            startTimeUtc: startTimeUtc.toISOString(),
            endTimeUtc: endTimeUtc.toISOString(),
            sessionToken: 'token-1'
        });
        const lockRes2 = await (0, supertest_1.default)(app_1.app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
            staffId,
            startTimeUtc: startTimeUtc.toISOString(),
            endTimeUtc: endTimeUtc.toISOString(),
            sessionToken: 'token-2'
        });
        console.log('DEBUG: Second lock status:', lockRes2.status);
        console.log('DEBUG: Second lock body:', JSON.stringify(lockRes2.body));
        (0, vitest_1.expect)(lockRes2.status).toBe(409);
    });
});
