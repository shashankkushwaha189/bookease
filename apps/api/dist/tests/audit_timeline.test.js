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
const client_1 = require("../src/generated/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../src/config/env");
const audit_service_1 = require("../src/modules/audit/audit.service");
(0, vitest_1.describe)('Audit & Timeline Integration', () => {
    let tenantId;
    let adminToken;
    let adminId;
    let serviceId;
    let staffId;
    let customerId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        // 1. Create Tenant
        const tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Audit Test Tenant',
                slug: 'audit-test',
            },
        });
        tenantId = tenant.id;
        // 2. Create Admin User
        const admin = await prisma_1.prisma.user.create({
            data: {
                tenantId,
                email: 'admin@audit.test',
                passwordHash: 'hash',
                role: client_1.UserRole.ADMIN,
            },
        });
        adminId = admin.id;
        adminToken = jsonwebtoken_1.default.sign({ sub: admin.id, tenantId, role: admin.role }, env_1.env.JWT_SECRET);
        // 3. Setup Service & Staff
        const service = await prisma_1.prisma.service.create({
            data: {
                tenantId,
                name: 'Test Audit Service',
                durationMinutes: 30,
            },
        });
        serviceId = service.id;
        const staff = await prisma_1.prisma.staff.create({
            data: {
                tenantId,
                name: 'Audit Staff',
            },
        });
        staffId = staff.id;
        const customer = await prisma_1.prisma.customer.create({
            data: {
                tenantId,
                name: 'Test Customer',
                email: 'test@example.com',
            }
        });
        customerId = customer.id;
    });
    (0, vitest_1.it)('should create a timeline event when an appointment is booked', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 24);
        const endTimeUtc = new Date(startTimeUtc.getTime() + 30 * 60 * 1000);
        const res = await (0, supertest_1.default)(app_1.app)
            .post('/api/public/bookings/book')
            .set('x-tenant-id', tenantId)
            .send({
            serviceId,
            staffId,
            customer: {
                name: 'Auditor',
                email: 'auditor@example.com',
            },
            startTimeUtc: startTimeUtc.toISOString(),
            endTimeUtc: endTimeUtc.toISOString(),
            sessionToken: 'audit-session-123',
            consentGiven: true
        });
        if (res.status !== 201) {
            console.error('TEST FAILURE BODY:', JSON.stringify(res.body, null, 2));
        }
        (0, vitest_1.expect)(res.status).toBe(201);
        const appointmentId = res.body.id || res.body.appointment?.id;
        console.log("TEST 1 APPOINTMENT ID is:", appointmentId, "Body was:", res.body);
        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));
        // Verify Timeline
        const timelineRes = await (0, supertest_1.default)(app_1.app)
            .get(`/api/appointments/${appointmentId}/timeline`)
            .set('x-tenant-id', tenantId);
        (0, vitest_1.expect)(timelineRes.status).toBe(200);
        (0, vitest_1.expect)(timelineRes.body).toHaveLength(1);
        (0, vitest_1.expect)(timelineRes.body[0].eventType).toBe(client_1.TimelineEvent.CREATED);
        (0, vitest_1.expect)(timelineRes.body[0].performedBy).toBe('PUBLIC');
        // Verify Audit Log
        const auditRes = await (0, supertest_1.default)(app_1.app)
            .get('/api/audit')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(auditRes.status).toBe(200);
        const log = auditRes.body.items.find((l) => l.action === 'appointment.create');
        (0, vitest_1.expect)(log).toBeDefined();
        (0, vitest_1.expect)(log.resourceId).toBe(appointmentId);
    });
    (0, vitest_1.it)('should create a timeline event and audit log on status change', async () => {
        // 1. Create appointment directly to speed up
        const appt = await prisma_1.prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId: (await prisma_1.prisma.customer.findFirst({ where: { tenantId } })).id,
                referenceId: 'AUDIT-001',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(),
                status: client_1.AppointmentStatus.BOOKED,
            }
        });
        // 2. Update status
        const res = await (0, supertest_1.default)(app_1.app)
            .patch(`/api/appointments/${appt.id}/status`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .send({
            status: client_1.AppointmentStatus.CONFIRMED,
            notes: 'Confirming for audit test'
        });
        if (res.status !== 200) {
            console.error('TEST FAILURE BODY (Status Update):', JSON.stringify(res.body, null, 2));
        }
        (0, vitest_1.expect)(res.status).toBe(200);
        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));
        // 3. Check Timeline
        const timelineRes = await (0, supertest_1.default)(app_1.app)
            .get(`/api/appointments/${appt.id}/timeline`)
            .set('x-tenant-id', tenantId);
        const confirmedEvent = timelineRes.body.find((e) => e.eventType === client_1.TimelineEvent.CONFIRMED);
        (0, vitest_1.expect)(confirmedEvent).toBeDefined();
        (0, vitest_1.expect)(confirmedEvent.performedBy).toBe(adminId);
        (0, vitest_1.expect)(confirmedEvent.note).toBe('Confirming for audit test');
        // 4. Check Audit
        const auditRes = await (0, supertest_1.default)(app_1.app)
            .get('/api/audit?action=appointment.status.confirmed')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(auditRes.body.items).toHaveLength(1);
        (0, vitest_1.expect)(auditRes.body.items[0].resourceId).toBe(appt.id);
        (0, vitest_1.expect)(auditRes.body.items[0].before.status).toBe(client_1.AppointmentStatus.BOOKED);
        (0, vitest_1.expect)(auditRes.body.items[0].after.status).toBe(client_1.AppointmentStatus.CONFIRMED);
    });
    (0, vitest_1.it)('should create ADMIN_OVERRIDE event when cancelling with override', async () => {
        const appt = await prisma_1.prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId: (await prisma_1.prisma.customer.findFirst({ where: { tenantId } })).id,
                referenceId: 'AUDIT-OVERRIDE-001',
                startTimeUtc: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future (inside window)
                endTimeUtc: new Date(Date.now() + 40 * 60 * 1000),
                status: client_1.AppointmentStatus.BOOKED,
            }
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .post(`/api/appointments/${appt.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .set('x-user-role', client_1.UserRole.ADMIN)
            .send({
            overrideReason: 'Testing audit override event logging'
        });
        if (res.status !== 200) {
            console.error('CANCEL OVERRIDE FLR:', JSON.stringify(res.body, null, 2));
        }
        (0, vitest_1.expect)(res.status).toBe(200);
        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));
        const timelineRes = await (0, supertest_1.default)(app_1.app)
            .get(`/api/appointments/${appt.id}/timeline`)
            .set('x-tenant-id', tenantId);
        const overrideEvent = timelineRes.body.find((e) => e.eventType === client_1.TimelineEvent.ADMIN_OVERRIDE);
        if (!overrideEvent) {
            console.error('TIMELINE BODY FOR OVERRIDE:', JSON.stringify(timelineRes.body, null, 2));
        }
        (0, vitest_1.expect)(overrideEvent).toBeDefined();
        (0, vitest_1.expect)(overrideEvent.note).toContain('Testing audit override');
    });
    (0, vitest_1.it)('should not allow deleting timeline events via API (regression check)', async () => {
        // Since we didn't add DELETE route, this should 404 naturally
        const res = await (0, supertest_1.default)(app_1.app)
            .delete(`/api/appointments/some-id/timeline`)
            .set('x-tenant-id', tenantId);
        (0, vitest_1.expect)(res.status).toBe(404);
    });
    (0, vitest_1.it)('should not fail the main request if audit logging fails (resilience)', async () => {
        // Mock auditService.logEvent to throw
        const spy = vitest_1.vi.spyOn(audit_service_1.auditService, 'logEvent')
            .mockRejectedValue(new Error('Audit DB Down'));
        const appt = await prisma_1.prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId,
                referenceId: 'AUDIT-FAIL-001',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(),
                status: client_1.AppointmentStatus.BOOKED,
            }
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .patch(`/api/appointments/${appt.id}/status`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .send({
            status: client_1.AppointmentStatus.CONFIRMED
        });
        // Request should still succeed
        (0, vitest_1.expect)(res.status).toBe(200);
        // Restore mock
        spy.mockRestore();
    });
});
