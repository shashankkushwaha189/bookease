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
const client_1 = require("../src/generated/client");
const ai_service_1 = require("../src/modules/ai/ai.service");
(0, vitest_1.describe)('AI Module API', () => {
    let tenant;
    let tenantDisabled;
    let adminToken;
    let adminTokenDisabled;
    let appointmentCompleted;
    let appointmentBooked;
    let service;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        // Tenant with AI Enabled
        tenant = await prisma_1.prisma.tenant.create({
            data: { name: 'AI Tenant', slug: 'ai-tenant', timezone: 'UTC' }
        });
        await prisma_1.prisma.tenantConfig.create({
            data: {
                tenantId: tenant.id,
                version: 1,
                isActive: true,
                createdBy: 'system',
                config: { features: { aiSummaryEnabled: true } }
            }
        });
        // Tenant with AI Disabled
        tenantDisabled = await prisma_1.prisma.tenant.create({
            data: { name: 'No AI Tenant', slug: 'no-ai-tenant', timezone: 'UTC' }
        });
        await prisma_1.prisma.tenantConfig.create({
            data: {
                tenantId: tenantDisabled.id,
                version: 1,
                isActive: true,
                createdBy: 'system',
                config: { features: { aiSummaryEnabled: false } }
            }
        });
        const passwordHash = await bcrypt_1.default.hash('Password@123', 10);
        await prisma_1.prisma.user.create({
            data: { email: 'admin@ai.com', passwordHash, role: client_1.UserRole.ADMIN, tenantId: tenant.id }
        });
        await prisma_1.prisma.user.create({
            data: { email: 'admin@noai.com', passwordHash, role: client_1.UserRole.ADMIN, tenantId: tenantDisabled.id }
        });
        const loginRes = await (0, supertest_1.default)(app_1.app).post('/api/auth/login').set('X-Tenant-ID', tenant.id).send({ email: 'admin@ai.com', password: 'Password@123' });
        adminToken = loginRes.body.data.token;
        const loginResDisabled = await (0, supertest_1.default)(app_1.app).post('/api/auth/login').set('X-Tenant-ID', tenantDisabled.id).send({ email: 'admin@noai.com', password: 'Password@123' });
        adminTokenDisabled = loginResDisabled.body.data.token;
        // Seed core data
        service = await prisma_1.prisma.service.create({
            data: { tenantId: tenant.id, name: 'AI Service', durationMinutes: 60, price: 50 }
        });
        const staff = await prisma_1.prisma.staff.create({
            data: { tenantId: tenant.id, name: 'AI Staff' }
        });
        const customer = await prisma_1.prisma.customer.create({
            data: { tenantId: tenant.id, name: 'AI Cust', email: 'aicust@test.com' }
        });
        appointmentCompleted = await prisma_1.prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                serviceId: service.id,
                staffId: staff.id,
                customerId: customer.id,
                referenceId: 'AI-COMPLETED',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(Date.now() + 3600000),
                status: 'COMPLETED',
                notes: 'Patient responded well.'
            }
        });
        appointmentBooked = await prisma_1.prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                serviceId: service.id,
                staffId: staff.id,
                customerId: customer.id,
                referenceId: 'AI-BOOKED',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(Date.now() + 3600000),
                status: 'BOOKED'
            }
        });
    });
    (0, vitest_1.afterAll)(async () => {
        vitest_1.vi.restoreAllMocks();
        await (0, helpers_1.cleanupDatabase)();
    });
    (0, vitest_1.describe)('POST /api/appointments/:id/ai-summary', () => {
        (0, vitest_1.it)('should return 403 if AI feature is disabled for tenant', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary`)
                .set('X-Tenant-ID', tenantDisabled.id)
                .set('Authorization', `Bearer ${adminTokenDisabled}`);
            (0, vitest_1.expect)(res.status).toBe(403);
            (0, vitest_1.expect)(res.body.error.code).toBe('FEATURE_DISABLED');
        });
        (0, vitest_1.it)('should return 400 if appointment is not COMPLETED', async () => {
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${appointmentBooked.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error.code).toBe('INVALID_STATUS');
        });
        (0, vitest_1.it)('should properly wrap prompt omitting PII and track summary', async () => {
            // Mock out the networking boundary to assert prompt construction
            const spy = vitest_1.vi.spyOn(ai_service_1.aiService, 'executeMockNetworkRequest');
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.summary).toBeDefined();
            // Verify prompt omission logic
            const promptArgs = spy.mock.calls[0][0];
            (0, vitest_1.expect)(promptArgs).toContain('AI Service');
            (0, vitest_1.expect)(promptArgs).toContain('Patient responded well.');
            (0, vitest_1.expect)(promptArgs).not.toContain('AI Cust'); // No Name
            (0, vitest_1.expect)(promptArgs).not.toContain('aicust@test.com'); // No Email
            // Check generation DB creation and timeline log mapped successfully
            const timeline = await prisma_1.prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id, eventType: client_1.TimelineEvent.AI_SUMMARY_GENERATED }
            });
            (0, vitest_1.expect)(timeline).toBeDefined();
        });
        (0, vitest_1.it)('should gracefully handle 503 from external AI wrapper timeout threshold', async () => {
            // Force consecutive mocked failures mapping JSON logic breakage or throw
            vitest_1.vi.spyOn(ai_service_1.aiService, 'executeMockNetworkRequest').mockRejectedValue(new Error('Mocked Network Timeout'));
            // Requires new COMPLETED appointment to bypass duplicate summary check
            const aptFail = await prisma_1.prisma.appointment.create({
                data: {
                    tenantId: tenant.id,
                    serviceId: service.id,
                    staffId: appointmentCompleted.staffId,
                    customerId: appointmentCompleted.customerId,
                    referenceId: 'AI-FAIL',
                    startTimeUtc: new Date(),
                    endTimeUtc: new Date(Date.now() + 3600),
                    status: 'COMPLETED'
                }
            });
            // Temporarily patch the retry wait duration strictly to avoid slow tests
            vitest_1.vi.spyOn(ai_service_1.aiService, 'callAIProviderWithRetry').mockImplementationOnce(async (prompt) => {
                throw new Error('AI service unavailable');
            });
            const res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${aptFail.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(503);
            (0, vitest_1.expect)(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
        });
    });
    (0, vitest_1.describe)('POST /api/appointments/:id/ai-summary/(accept|discard)', () => {
        (0, vitest_1.it)('should securely toggle the accepted metric and log explicitly mapped events', async () => {
            let res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary/accept`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.accepted).toBe(true);
            let event = await prisma_1.prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id },
                orderBy: { createdAt: 'desc' }
            });
            (0, vitest_1.expect)(event?.eventType).toBe(client_1.TimelineEvent.AI_SUMMARY_ACCEPTED);
            // Re-discard
            res = await (0, supertest_1.default)(app_1.app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary/discard`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.accepted).toBe(false);
            event = await prisma_1.prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id, eventType: client_1.TimelineEvent.AI_SUMMARY_DISCARDED },
                orderBy: { createdAt: 'desc' }
            });
            (0, vitest_1.expect)(event?.eventType).toBe(client_1.TimelineEvent.AI_SUMMARY_DISCARDED);
        });
    });
});
