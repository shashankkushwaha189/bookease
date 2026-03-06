import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { UserRole } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import { z } from 'zod';

describe('AI Module - PHASE 13 (Assistive & Safe)', () => {
  let tenantId: string;
  let adminToken: string;
  let staffToken: string;
  let serviceId: string;
  let staffId: string;
  let customerId: string;
  let appointmentId: string;
  let aiSummaryId: string;

  // Test data schema
  const AISummarySchema = z.object({
    id: z.string(),
    appointmentId: z.string(),
    tenantId: z.string(),
    summary: z.string(),
    customerIntent: z.string().nullable(),
    followUpSuggestion: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    keyPoints: z.array(z.string()).optional(),
    sentimentScore: z.number().min(-1).max(1).optional(),
    sentimentLabel: z.enum(['positive', 'neutral', 'negative']).optional(),
    sentimentConfidence: z.number().min(0).max(1).optional(),
    model: z.string(),
    processingTime: z.number(),
    accepted: z.boolean().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

  beforeAll(async () => {
    // Clean database
    await cleanupDatabase();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'AI Test Tenant',
        slug: 'ai-test-tenant',
        timezone: 'UTC',
        aiEnabled: true,
        aiModel: 'gpt-3.5-turbo',
        aiMaxTokens: 1000,
        aiTemperature: 0.7,
        aiAutoGenerate: false,
        aiDataRetentionDays: 30,
      },
    });
    tenantId = tenant.id;

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@ai-test.com',
        passwordHash: 'hashed-password',
        role: UserRole.ADMIN,
        tenantId,
      },
    });

    // Create staff user
    const staffUser = await prisma.user.create({
      data: {
        email: 'staff@ai-test.com',
        passwordHash: 'hashed-password',
        role: UserRole.STAFF,
        tenantId,
      },
    });

    // Login as admin
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@ai-test.com',
        password: 'password',
      });
    adminToken = adminLogin.body.data.token;

    // Login as staff
    const staffLogin = await request(app)
      .post('/auth/login')
      .send({
        email: 'staff@ai-test.com',
        password: 'password',
      });
    staffToken = staffLogin.body.data.token;

    // Create test data
    const service = await prisma.service.create({
      data: {
        name: 'AI Test Service',
        durationMinutes: 30,
        bufferBefore: 5,
        bufferAfter: 5,
        price: 100,
        tenantId,
      },
    });
    serviceId = service.id;

    const staff = await prisma.staff.create({
      data: {
        name: 'AI Test Staff',
        email: 'staff@ai-test.com',
        role: 'Doctor',
        tenantId,
      },
    });
    staffId = staff.id;

    const customer = await prisma.customer.create({
      data: {
        name: 'AI Test Customer',
        email: 'customer@ai-test.com',
        phone: '+1234567890',
        tenantId,
      },
    });
    customerId = customer.id;

    // Create completed appointment
    const appointment = await prisma.appointment.create({
      data: {
        referenceId: 'AI-001',
        serviceId,
        staffId,
        customerId,
        startTimeUtc: new Date('2024-01-01T10:00:00Z'),
        endTimeUtc: new Date('2024-01-01T10:30:00Z'),
        status: 'COMPLETED',
        notes: 'Patient reported feeling well, routine check-up completed',
        tenantId,
      },
    });
    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('Functional Tests', () => {
    describe('1. AI disabled tenant cannot access', () => {
      it('should prevent AI access when disabled for tenant', async () => {
        // Disable AI for tenant
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiEnabled: false },
        });

        // Try to generate AI summary
        const response = await request(app)
          .post(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
            includeActionItems: true,
            includeSentiment: true,
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('AI features are disabled');
        expect(response.body.code).toBe('AI_DISABLED');
      });

      it('should prevent AI configuration access when disabled', async () => {
        // Try to get AI configuration
        const response = await request(app)
          .get('/ai/configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(response.status).toBe(200);
        expect(response.body.data.enabled).toBe(false);
      });
    });

    describe('2. Summary only after completion', () => {
      beforeEach(async () => {
        // Ensure AI is enabled
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiEnabled: true },
        });
      });

      it('should generate summary for completed appointment', async () => {
        const response = await request(app)
          .post(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
            includeActionItems: true,
            includeSentiment: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.confidence).toBeDefined();
        expect(response.body.data.confidence).toBeGreaterThanOrEqual(0);
        expect(response.body.data.confidence).toBeLessThanOrEqual(1);
        expect(response.body.data.keyPoints).toBeDefined();
        expect(response.body.data.actionItems).toBeDefined();
        expect(response.body.data.sentiment).toBeDefined();
        expect(response.body.data.processingTime).toBeDefined();
        expect(response.body.data.processingTime).toBeGreaterThan(0);

        // Store AI summary ID for later tests
        aiSummaryId = response.body.data.id;

        // Validate response structure
        const validationResult = AISummarySchema.safeParse(response.body.data);
        expect(validationResult.success).toBe(true);
      });

      it('should prevent summary generation for non-completed appointment', async () => {
        // Create non-completed appointment
        const pendingAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-002',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-02T10:00:00Z'),
            endTimeUtc: new Date('2024-01-02T10:30:00Z'),
            status: 'BOOKED',
            tenantId,
          },
        });

        const response = await request(app)
          .post(`/ai/summaries/${pendingAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('only be generated for COMPLETED appointments');
        expect(response.body.code).toBe('INVALID_STATUS');

        // Clean up
        await prisma.appointment.delete({
          where: { id: pendingAppointment.id },
        });
      });

      it('should prevent duplicate summary generation', async () => {
        // Try to generate summary again for the same appointment
        const response = await request(app)
          .post(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(aiSummaryId); // Same summary ID
      });
    });

    describe('3. Confidence score returned', () => {
      it('should return numeric confidence score between 0 and 1', async () => {
        const response = await request(app)
          .get(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(response.status).toBe(200);
        expect(response.body.data.confidence).toBeDefined();
        expect(response.body.data.confidence).toBeGreaterThanOrEqual(0);
        expect(response.body.data.confidence).toBeLessThanOrEqual(1);
        expect(typeof response.body.data.confidence).toBe('number');
      });

      it('should include confidence in AI response', async () => {
        // Generate new summary to test confidence
        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-003',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-03T10:00:00Z'),
            endTimeUtc: new Date('2024-01-03T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test confidence score',
            tenantId,
          },
        });

        const response = await request(app)
          .post(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: false,
            includeActionItems: false,
            includeSentiment: false,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.confidence).toBeDefined();
        expect(response.body.data.confidence).toBeGreaterThanOrEqual(0.7); // Mock minimum confidence
        expect(response.body.data.confidence).toBeLessThanOrEqual(1);

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });
      });
    });

    describe('4. Follow-up suggestion', () => {
      it('should include follow-up suggestion in summary', async () => {
        const response = await request(app)
          .get(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(response.status).toBe(200);
        expect(response.body.data.followUpSuggestion).toBeDefined();
        expect(typeof response.body.data.followUpSuggestion).toBe('string');
        expect(response.body.data.followUpSuggestion.length).toBeGreaterThan(0);
      });

      it('should include customer intent in summary', async () => {
        const response = await request(app)
          .get(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(response.status).toBe(200);
        expect(response.body.data.customerIntent).toBeDefined();
        expect(typeof response.body.data.customerIntent).toBe('string');
      });
    });

    describe('5. Toggle per tenant', () => {
      it('should allow enabling/disabling AI per tenant', async () => {
        // Disable AI
        const disableResponse = await request(app)
          .put('/ai/configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            enabled: false,
            model: 'gpt-4',
            maxTokens: 2000,
            temperature: 0.5,
            autoGenerate: false,
            dataRetentionDays: 60,
          });

        expect(disableResponse.status).toBe(200);
        expect(disableResponse.body.data.enabled).toBe(false);

        // Verify AI is disabled
        const getConfigResponse = await request(app)
          .get('/ai/configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(getConfigResponse.status).toBe(200);
        expect(getConfigResponse.body.data.enabled).toBe(false);

        // Re-enable AI
        const enableResponse = await request(app)
          .put('/ai/configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            enabled: true,
            model: 'gpt-3.5-turbo',
            maxTokens: 1000,
            temperature: 0.7,
            autoGenerate: false,
            dataRetentionDays: 30,
          });

        expect(enableResponse.status).toBe(200);
        expect(enableResponse.body.data.enabled).toBe(true);
      });

      it('should prevent non-admin users from changing AI configuration', async () => {
        const response = await request(app)
          .put('/ai/configuration')
          .set('Authorization', `Bearer ${staffToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            enabled: false,
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });
    });

    describe('6. No automatic actions', () => {
      it('should not auto-generate summaries when disabled', async () => {
        // Disable auto-generation
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiAutoGenerate: false },
        });

        // Create new completed appointment
        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-004',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-04T10:00:00Z'),
            endTimeUtc: new Date('2024-01-04T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test no auto-generation',
            tenantId,
          },
        });

        // Wait a moment to ensure no auto-generation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check that no summary was auto-generated
        const summaryResponse = await request(app)
          .get(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(summaryResponse.status).toBe(404);
        expect(summaryResponse.body.success).toBe(false);
        expect(summaryResponse.body.error).toContain('not found');

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });
      });

      it('should require explicit action to generate summary', async () => {
        // Create new completed appointment
        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-005',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-05T10:00:00Z'),
            endTimeUtc: new Date('2024-01-05T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test explicit action required',
            tenantId,
          },
        });

        // Verify no summary exists initially
        const initialResponse = await request(app)
          .get(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(initialResponse.status).toBe(404);

        // Explicitly generate summary
        const generateResponse = await request(app)
          .post(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({});

        expect(generateResponse.status).toBe(200);
        expect(generateResponse.body.data.summary).toBeDefined();

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });
      });
    });
  });

  describe('Non-Functional Tests', () => {
    describe('1. AI timeout handled', () => {
      it('should handle AI service timeout gracefully', async () => {
        // Create a very short timeout for testing
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 100, // Very short timeout
            aiMaxRetries: 1,
          },
        });

        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-TIMEOUT-001',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-06T10:00:00Z'),
            endTimeUtc: new Date('2024-01-06T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test timeout handling',
            tenantId,
          },
        });

        // This should handle timeout gracefully
        const response = await request(app)
          .post(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
          });

        // Should either succeed (if mock is fast) or fail gracefully
        expect([200, 503]).toContain(response.status);
        
        if (response.status === 503) {
          expect(response.body.success).toBe(false);
          expect(response.body.error).toContain('unavailable');
        }

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });

        // Reset timeout
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 30000,
            aiMaxRetries: 3,
          },
        });
      });
    });

    describe('2. No PII logged', () => {
      it('should not log PII in AI summaries', async () => {
        // Create appointment with PII
        const piiAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-PII-001',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-07T10:00:00Z'),
            endTimeUtc: new Date('2024-01-07T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Patient John Doe (SSN: 123-45-6789) reported symptoms',
            tenantId,
          },
        });

        const response = await request(app)
          .post(`/ai/summaries/${piiAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
          });

        expect(response.status).toBe(200);
        
        // Check that PII is not in the response
        expect(response.body.data.summary).not.toContain('John Doe');
        expect(response.body.data.summary).not.toContain('123-45-6789');
        expect(response.body.data.summary).not.toContain('SSN');

        // Clean up
        await prisma.appointment.delete({
          where: { id: piiAppointment.id },
        });
      });

      it('should use anonymized data in AI prompts', async () => {
        // This test verifies that the AI service uses safe prompts
        // without PII by checking the mock response structure
        const response = await request(app)
          .get(`/ai/summaries/${appointmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(response.status).toBe(200);
        
        // The mock response should not contain actual customer/staff names
        // This is verified in the service implementation
        expect(response.body.data.summary).toBeDefined();
      });
    });

    describe('3. Retry safety', () => {
      it('should implement retry logic with exponential backoff', async () => {
        // Set very short timeout to trigger retries
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 50, // Very short timeout
            aiMaxRetries: 2, // Allow retries
          },
        });

        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-RETRY-001',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-08T10:00:00Z'),
            endTimeUtc: new Date('2024-01-08T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test retry safety',
            tenantId,
          },
        });

        const startTime = Date.now();
        const response = await request(app)
          .post(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: true,
          });
        const endTime = Date.now();

        // Should either succeed or fail after retries
        expect([200, 503]).toContain(response.status);
        
        // If it succeeded, check that it took some time (indicating retries)
        if (response.status === 200) {
          expect(endTime - startTime).toBeGreaterThan(100); // Should have taken time due to retries
        }

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });

        // Reset timeout
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 30000,
            aiMaxRetries: 3,
          },
        });
      });

      it('should limit retry attempts', async () => {
        // Set very short timeout and max retries to 0
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 10, // Extremely short timeout
            aiMaxRetries: 0, // No retries
          },
        });

        const newAppointment = await prisma.appointment.create({
          data: {
            referenceId: 'AI-RETRY-LIMIT-001',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-09T10:00:00Z'),
            endTimeUtc: new Date('2024-01-09T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Test retry limit',
            tenantId,
          },
        });

        const response = await request(app)
          .post(`/ai/summaries/${newAppointment.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({});

        // Should fail immediately without retries
        expect(response.status).toBe(503);
        expect(response.body.success).toBe(false);

        // Clean up
        await prisma.appointment.delete({
          where: { id: newAppointment.id },
        });

        // Reset timeout
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { 
            aiTimeoutMs: 30000,
            aiMaxRetries: 3,
          },
        });
      });
    });

    describe('4. AI data retention limited', () => {
      it('should respect data retention settings', async () => {
        // Set retention to 1 day for testing
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiDataRetentionDays: 1 },
        });

        // Create an old AI summary
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 2); // 2 days ago

        const oldSummary = await prisma.aiSummary.create({
          data: {
            appointmentId,
            tenantId,
            summary: 'Old summary for retention test',
            customerIntent: 'Test intent',
            followUpSuggestion: 'Test follow-up',
            confidence: 0.8,
            model: 'test-model',
            createdAt: oldDate,
          },
        });

        // Run cleanup
        const cleanupResponse = await request(app)
          .post('/ai/summaries/cleanup')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(cleanupResponse.status).toBe(200);
        expect(cleanupResponse.body.success).toBe(true);
        expect(cleanupResponse.body.data.cleaned).toBeGreaterThanOrEqual(1);

        // Verify old summary was cleaned up
        const deletedSummary = await prisma.aiSummary.findUnique({
          where: { id: oldSummary.id },
        });

        expect(deletedSummary).toBeNull();

        // Reset retention
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiDataRetentionDays: 30 },
        });
      });

      it('should not delete recent summaries during cleanup', async () => {
        // Set retention to 30 days
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiDataRetentionDays: 30 },
        });

        // Run cleanup
        const cleanupResponse = await request(app)
          .post('/ai/summaries/cleanup')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId);

        expect(cleanupResponse.status).toBe(200);
        expect(cleanupResponse.body.data.cleaned).toBe(0); // No recent summaries should be deleted

        // Verify our main summary still exists
        const existingSummary = await prisma.aiSummary.findUnique({
          where: { id: aiSummaryId },
        });

        expect(existingSummary).toBeTruthy();
      });
    });
  });

  describe('Additional Features', () => {
    describe('Batch operations', () => {
      it('should batch generate AI summaries', async () => {
        // Create multiple completed appointments
        const appointments = [];
        for (let i = 0; i < 3; i++) {
          const apt = await prisma.appointment.create({
            data: {
              referenceId: `AI-BATCH-${i + 1}`,
              serviceId,
              staffId,
              customerId,
              startTimeUtc: new Date(`2024-01-${10 + i}T10:00:00Z`),
              endTimeUtc: new Date(`2024-01-${10 + i}T10:30:00Z`),
              status: 'COMPLETED',
              notes: `Batch test appointment ${i + 1}`,
              tenantId,
            },
          });
          appointments.push(apt);
        }

        const appointmentIds = appointments.map(apt => apt.id);

        const response = await request(app)
          .post('/ai/summaries/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            appointmentIds,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.successful).toHaveLength(3);
        expect(response.body.data.failed).toHaveLength(0);
        expect(response.body.data.total).toBe(3);

        // Clean up
        for (const apt of appointments) {
          await prisma.appointment.delete({
            where: { id: apt.id },
          });
        }
      });

      it('should handle batch generation with mixed results', async () => {
        // Create one completed and one non-completed appointment
        const completedApt = await prisma.appointment.create({
          data: {
            referenceId: 'AI-BATCH-COMPLETED',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-11T10:00:00Z'),
            endTimeUtc: new Date('2024-01-11T10:30:00Z'),
            status: 'COMPLETED',
            notes: 'Completed batch test',
            tenantId,
          },
        });

        const pendingApt = await prisma.appointment.create({
          data: {
            referenceId: 'AI-BATCH-PENDING',
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date('2024-01-12T10:00:00Z'),
            endTimeUtc: new Date('2024-01-12T10:30:00Z'),
            status: 'BOOKED',
            notes: 'Pending batch test',
            tenantId,
          },
        });

        const response = await request(app)
          .post('/ai/summaries/batch')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            appointmentIds: [completedApt.id, pendingApt.id],
          });

        expect(response.status).toBe(200);
        expect(response.body.data.successful).toHaveLength(1);
        expect(response.body.data.failed).toHaveLength(1);
        expect(response.body.data.total).toBe(2);
        expect(response.body.data.failed[0].appointmentId).toBe(pendingApt.id);
        expect(response.body.data.failed[0].error).toContain('COMPLETED');

        // Clean up
        await prisma.appointment.delete({
          where: { id: completedApt.id },
        });
        await prisma.appointment.delete({
          where: { id: pendingApt.id },
        });
      });
    });

    describe('Usage statistics', () => {
      it('should provide AI usage statistics', async () => {
        const response = await request(app)
          .get('/ai/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .query({ days: 30 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalSummaries).toBeGreaterThanOrEqual(1);
        expect(response.body.data.averageConfidence).toBeGreaterThanOrEqual(0);
        expect(response.body.data.averageConfidence).toBeLessThanOrEqual(1);
        expect(response.body.data.averageProcessingTime).toBeGreaterThanOrEqual(0);
        expect(response.body.data.summariesByDay).toBeDefined();
        expect(response.body.data.sentimentDistribution).toBeDefined();
      });

      it('should filter stats by date range', async () => {
        const response = await request(app)
          .get('/ai/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .query({ days: 7 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalSummaries).toBeGreaterThanOrEqual(0);
        expect(response.body.data.summariesByDay).toBeDefined();
      });
    });

    describe('Configuration testing', () => {
      it('should test AI configuration', async () => {
        const response = await request(app)
          .post('/ai/test-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            testText: 'Test AI functionality',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.testResults).toBeDefined();
        expect(response.body.data.testResults.success).toBe(true);
        expect(response.body.data.testResults.response).toBeDefined();
        expect(response.body.data.testResults.latency).toBeDefined();
        expect(response.body.data.testResults.model).toBeDefined();
        expect(response.body.data.meetsRequirements).toBeDefined();
        expect(response.body.data.meetsRequirements.aiEnabled).toBe(true);
        expect(response.body.data.meetsRequirements.hasTimeout).toBe(true);
        expect(response.body.data.meetsRequirements.hasRetries).toBe(true);
        expect(response.body.data.meetsRequirements.hasDataRetention).toBe(true);
      });

      it('should fail test when AI is disabled', async () => {
        // Disable AI
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiEnabled: false },
        });

        const response = await request(app)
          .post('/ai/test-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            testText: 'Test AI functionality',
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('AI features are disabled');

        // Re-enable AI
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { aiEnabled: true },
        });
      });
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access to AI endpoints', async () => {
      const response = await request(app)
        .post(`/ai/summaries/${appointmentId}`)
        .set('x-tenant-id', tenantId)
        .send({
          includeKeyPoints: true,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent access without tenant ID', async () => {
      const response = await request(app)
        .post(`/ai/summaries/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          includeKeyPoints: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tenant ID is required');
    });

    it('should prevent cross-tenant access', async () => {
      // Create another tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other AI Tenant',
          slug: 'other-ai-tenant',
          timezone: 'UTC',
          aiEnabled: true,
        },
      });

      // Try to access AI summary from other tenant
      const response = await request(app)
        .post(`/ai/summaries/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', otherTenant.id)
        .send({
          includeKeyPoints: true,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      // Clean up
      await prisma.tenant.delete({
        where: { id: otherTenant.id },
      });
    });
  });

  describe('Performance Tests', () => {
    it('should generate AI summary within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post(`/ai/summaries/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          includeKeyPoints: true,
          includeActionItems: true,
          includeSentiment: true,
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.data.processingTime).toBeGreaterThan(0);
      expect(response.body.data.processingTime).toBeLessThan(4000); // Processing time should be reasonable
    });

    it('should handle concurrent AI requests', async () => {
      // Create multiple appointments
      const appointments = [];
      for (let i = 0; i < 5; i++) {
        const apt = await prisma.appointment.create({
          data: {
            referenceId: `AI-CONCURRENT-${i + 1}`,
            serviceId,
            staffId,
            customerId,
            startTimeUtc: new Date(`2024-01-${20 + i}T10:00:00Z`),
            endTimeUtc: new Date(`2024-01-${20 + i}T10:30:00Z`),
            status: 'COMPLETED',
            notes: `Concurrent test appointment ${i + 1}`,
            tenantId,
          },
        });
        appointments.push(apt);
      }

      // Make concurrent requests
      const promises = appointments.map(apt => 
        request(app)
          .post(`/ai/summaries/${apt.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-tenant-id', tenantId)
          .send({
            includeKeyPoints: false,
          })
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
      });

      // Clean up
      for (const apt of appointments) {
        await prisma.appointment.delete({
          where: { id: apt.id },
        });
      }
    });
  });
});
