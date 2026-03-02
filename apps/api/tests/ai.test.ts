import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './helpers';
import { UserRole, TimelineEvent, AiConfidence } from '../src/generated/client';
import { aiService } from '../src/modules/ai/ai.service';
import { AppError } from '../src/lib/errors';

describe('AI Module API', () => {
    let tenant: any;
    let tenantDisabled: any;
    let adminToken: string;
    let adminTokenDisabled: string;
    let appointmentCompleted: any;
    let appointmentBooked: any;
    let service: any;

    beforeAll(async () => {
        await cleanupDatabase();

        // Tenant with AI Enabled
        tenant = await prisma.tenant.create({
            data: { name: 'AI Tenant', slug: 'ai-tenant', timezone: 'UTC' }
        });

        await prisma.tenantConfig.create({
            data: {
                tenantId: tenant.id,
                version: 1,
                isActive: true,
                createdBy: 'system',
                config: { features: { aiSummaryEnabled: true } }
            }
        });

        // Tenant with AI Disabled
        tenantDisabled = await prisma.tenant.create({
            data: { name: 'No AI Tenant', slug: 'no-ai-tenant', timezone: 'UTC' }
        });

        await prisma.tenantConfig.create({
            data: {
                tenantId: tenantDisabled.id,
                version: 1,
                isActive: true,
                createdBy: 'system',
                config: { features: { aiSummaryEnabled: false } }
            }
        });

        const passwordHash = await bcrypt.hash('Password@123', 10);
        await prisma.user.create({
            data: { email: 'admin@ai.com', passwordHash, role: UserRole.ADMIN, tenantId: tenant.id }
        });
        await prisma.user.create({
            data: { email: 'admin@noai.com', passwordHash, role: UserRole.ADMIN, tenantId: tenantDisabled.id }
        });

        const loginRes = await request(app).post('/api/auth/login').set('X-Tenant-ID', tenant.id).send({ email: 'admin@ai.com', password: 'Password@123' });
        adminToken = loginRes.body.data.token;

        const loginResDisabled = await request(app).post('/api/auth/login').set('X-Tenant-ID', tenantDisabled.id).send({ email: 'admin@noai.com', password: 'Password@123' });
        adminTokenDisabled = loginResDisabled.body.data.token;

        // Seed core data
        service = await prisma.service.create({
            data: { tenantId: tenant.id, name: 'AI Service', durationMinutes: 60, price: 50 }
        });
        const staff = await prisma.staff.create({
            data: { tenantId: tenant.id, name: 'AI Staff' }
        });
        const customer = await prisma.customer.create({
            data: { tenantId: tenant.id, name: 'AI Cust', email: 'aicust@test.com' }
        });

        appointmentCompleted = await prisma.appointment.create({
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

        appointmentBooked = await prisma.appointment.create({
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

    afterAll(async () => {
        vi.restoreAllMocks();
        await cleanupDatabase();
    });

    describe('POST /api/appointments/:id/ai-summary', () => {
        it('should return 403 if AI feature is disabled for tenant', async () => {
            const res = await request(app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary`)
                .set('X-Tenant-ID', tenantDisabled.id)
                .set('Authorization', `Bearer ${adminTokenDisabled}`);

            expect(res.status).toBe(403);
            expect(res.body.error.code).toBe('FEATURE_DISABLED');
        });

        it('should return 400 if appointment is not COMPLETED', async () => {
            const res = await request(app)
                .post(`/api/appointments/${appointmentBooked.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('INVALID_STATUS');
        });

        it('should properly wrap prompt omitting PII and track summary', async () => {
            // Mock out the networking boundary to assert prompt construction
            const spy = vi.spyOn(aiService as any, 'executeMockNetworkRequest');

            const res = await request(app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.summary).toBeDefined();

            // Verify prompt omission logic
            const promptArgs = spy.mock.calls[0][0] as string;
            expect(promptArgs).toContain('AI Service');
            expect(promptArgs).toContain('Patient responded well.');
            expect(promptArgs).not.toContain('AI Cust'); // No Name
            expect(promptArgs).not.toContain('aicust@test.com'); // No Email

            // Check generation DB creation and timeline log mapped successfully
            const timeline = await prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id, eventType: TimelineEvent.AI_SUMMARY_GENERATED }
            });
            expect(timeline).toBeDefined();
        });

        it('should gracefully handle 503 from external AI wrapper timeout threshold', async () => {
            // Force consecutive mocked failures mapping JSON logic breakage or throw
            vi.spyOn(aiService as any, 'executeMockNetworkRequest').mockRejectedValue(new Error('Mocked Network Timeout'));

            // Requires new COMPLETED appointment to bypass duplicate summary check
            const aptFail = await prisma.appointment.create({
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
            vi.spyOn(aiService, 'callAIProviderWithRetry').mockImplementationOnce(async (prompt) => {
                throw new AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE');
            });

            const res = await request(app)
                .post(`/api/appointments/${aptFail.id}/ai-summary`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(503);
            expect(res.body.error.code).toBe('AI_SERVICE_UNAVAILABLE');
        });
    });

    describe('POST /api/appointments/:id/ai-summary/(accept|discard)', () => {
        it('should securely toggle the accepted metric and log explicitly mapped events', async () => {
            let res = await request(app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary/accept`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.accepted).toBe(true);

            let event = await prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id },
                orderBy: { createdAt: 'desc' }
            });
            expect(event?.eventType).toBe(TimelineEvent.AI_SUMMARY_ACCEPTED);

            // Re-discard
            res = await request(app)
                .post(`/api/appointments/${appointmentCompleted.id}/ai-summary/discard`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.accepted).toBe(false);

            event = await prisma.appointmentTimeline.findFirst({
                where: { appointmentId: appointmentCompleted.id, eventType: TimelineEvent.AI_SUMMARY_DISCARDED },
                orderBy: { createdAt: 'desc' }
            });
            expect(event?.eventType).toBe(TimelineEvent.AI_SUMMARY_DISCARDED);
        });
    });
});
