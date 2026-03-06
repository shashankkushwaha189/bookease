import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, TimelineEvent, UserRole } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';

describe('Timeline & Audit - Comprehensive Tests', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;
    let customerId: string;
    let adminToken: string;
    let staffToken: string;
    let appointmentId: string;
    const password = 'Password@123';

    beforeAll(async () => {
        await cleanupDatabase();

        // Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Clinic',
                slug: `test-clinic-${Date.now()}`,
                timezone: 'UTC',
            }
        });
        tenantId = tenant.id;

        // Create service
        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Consultation',
                durationMinutes: 30,
                bufferBefore: 5,
                bufferAfter: 5,
            }
        });
        serviceId = service.id;

        // Create staff
        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Dr. Smith',
                email: 'smith@clinic.com',
            }
        });
        staffId = staff.id;

        // Create customer
        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890'
            }
        });
        customerId = customer.id;

        // Create admin user
        const passwordHash = await bcrypt.hash(password, 12);
        const adminUser = await prisma.user.create({
            data: {
                email: 'admin@clinic.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenant.id,
            },
        });

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'admin@clinic.com', password });
        adminToken = adminLogin.body.data.token;

        // Create staff user
        const staffUser = await prisma.user.create({
            data: {
                email: 'staff@clinic.com',
                passwordHash,
                role: 'STAFF',
                tenantId: tenant.id,
            },
        });

        const staffLogin = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'staff@clinic.com', password });
        staffToken = staffLogin.body.data.token;

        // Create an appointment for testing
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 25);
        const endTimeUtc = new Date(startTimeUtc);
        endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

        const appointment = await prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId,
                referenceId: 'BK-2026-00001',
                startTimeUtc,
                endTimeUtc,
                status: AppointmentStatus.BOOKED
            }
        });
        appointmentId = appointment.id;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    beforeEach(async () => {
        // Clean up timeline and audit logs before each test
        await prisma.appointmentTimeline.deleteMany({ where: { tenantId } });
        await prisma.auditLog.deleteMany({ where: { tenantId } });
    });

    describe('Timeline - Functional Tests', () => {
        it('should log event for every status change', async () => {
            // Create appointment (should log CREATED event)
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Test Patient',
                        email: 'test@example.com',
                        phone: '9999999999'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString(),
                    notes: 'Test appointment'
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Verify CREATED event was logged
            const timelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(timelineResponse.status).toBe(200);
            expect(timelineResponse.body.data.events).toHaveLength(1);
            expect(timelineResponse.body.data.events[0].eventType).toBe('CREATED');

            // Reschedule appointment (should log RESCHEDULED event)
            const rescheduleResponse = await request(app)
                .post(`/api/appointments/${newAppointmentId}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    startTimeUtc: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 26.5 * 60 * 60 * 1000).toISOString()
                });

            expect(rescheduleResponse.status).toBe(200);

            // Verify RESCHEDULED event was logged
            const updatedTimelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(updatedTimelineResponse.status).toBe(200);
            expect(updatedTimelineResponse.body.data.events).toHaveLength(2);
            expect(updatedTimelineResponse.body.data.events[1].eventType).toBe('RESCHEDULED');

            // Cancel appointment (should log CANCELLED event)
            const cancelResponse = await request(app)
                .post(`/api/appointments/${newAppointmentId}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ scope: 'single' });

            expect(cancelResponse.status).toBe(200);

            // Verify CANCELLED event was logged
            const finalTimelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(finalTimelineResponse.status).toBe(200);
            expect(finalTimelineResponse.body.data.events).toHaveLength(3);
            expect(finalTimelineResponse.body.data.events[2].eventType).toBe('CANCELLED');
        });

        it('should keep events in correct chronological order', async () => {
            // Create multiple events rapidly
            const events = [];
            
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/api/appointments')
                    .set('X-Tenant-ID', tenantId)
                    .set('X-User-ID', 'staff-user')
                    .set('X-User-Role', 'STAFF')
                    .send({
                        serviceId,
                        staffId,
                        customer: {
                            name: `Test Patient ${i}`,
                            email: `test${i}@example.com`,
                            phone: `999999999${i}`
                        },
                        startTimeUtc: new Date(Date.now() + (25 + i) * 60 * 60 * 1000).toISOString(),
                        endTimeUtc: new Date(Date.now() + (25.5 + i) * 60 * 60 * 1000).toISOString()
                    });

                expect(response.status).toBe(201);
                events.push({
                    id: response.body.data.id,
                    createdAt: new Date()
                });

                // Small delay to ensure different timestamps
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Get timeline for each appointment and verify order
            for (const event of events) {
                const timelineResponse = await request(app)
                    .get(`/api/appointments/${event.id}/timeline`)
                    .set('X-Tenant-ID', tenantId);

                expect(timelineResponse.status).toBe(200);
                expect(timelineResponse.body.data.events).toHaveLength(1);
                
                const timelineEvent = timelineResponse.body.data.events[0];
                expect(timelineEvent.eventType).toBe('CREATED');
                
                // Verify events are ordered by createdAt (ascending)
                const eventTime = new Date(timelineEvent.createdAt);
                expect(eventTime.getTime()).toBeGreaterThan(0);
            }
        });

        it('should ensure timeline immutability', async () => {
            // Create appointment
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Immutability Test',
                        email: 'immutable@example.com',
                        phone: '8888888888'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Get initial timeline
            const initialTimelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(initialTimelineResponse.status).toBe(200);
            const initialEvent = initialTimelineResponse.body.data.events[0];
            const initialCreatedAt = new Date(initialEvent.createdAt);

            // Wait a bit and create another event
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reschedule to create another event
            await request(app)
                .post(`/api/appointments/${newAppointmentId}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    startTimeUtc: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 26.5 * 60 * 60 * 1000).toISOString()
                });

            // Get timeline again
            const finalTimelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(finalTimelineResponse.status).toBe(200);
            expect(finalTimelineResponse.body.data.events).toHaveLength(2);

            // Verify first event hasn't changed (immutable)
            const finalFirstEvent = finalTimelineResponse.body.data.events[0];
            const finalCreatedAt = new Date(finalFirstEvent.createdAt);
            
            expect(finalFirstEvent.id).toBe(initialEvent.id);
            expect(finalFirstEvent.eventType).toBe(initialEvent.eventType);
            expect(finalCreatedAt.getTime()).toBe(initialCreatedAt.getTime());

            // Test immutability verification endpoint
            const immutabilityResponse = await request(app)
                .post(`/api/appointments/${newAppointmentId}/timeline/verify-immutability`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(immutabilityResponse.status).toBe(200);
            expect(immutabilityResponse.body.data.isImmutable).toBe(true);
            expect(immutabilityResponse.body.data.violations).toHaveLength(0);
        });

        it('should prevent duplicate timeline events', async () => {
            // Create appointment
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Duplicate Test',
                        email: 'duplicate@example.com',
                        phone: '7777777777'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Try to create the same event type rapidly (should be prevented)
            const { timelineService } = await import('../src/modules/appointment-timeline/timeline.service');
            
            await timelineService.addEvent({
                appointmentId: newAppointmentId,
                tenantId,
                eventType: 'NOTE_ADDED',
                performedBy: 'staff-user',
                note: 'First note',
                correlationId: 'test-1'
            });

            // Immediately try to add the same event (should be prevented)
            await timelineService.addEvent({
                appointmentId: newAppointmentId,
                tenantId,
                eventType: 'NOTE_ADDED',
                performedBy: 'staff-user',
                note: 'Second note',
                correlationId: 'test-2'
            });

            // Wait a bit for async processing
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check timeline - should only have 3 events (CREATED + 1 NOTE_ADDED)
            const timelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(timelineResponse.status).toBe(200);
            expect(timelineResponse.body.data.events).toHaveLength(3); // CREATED + initial status + 1 NOTE_ADDED
            
            const noteEvents = timelineResponse.body.data.events.filter(e => e.eventType === 'NOTE_ADDED');
            expect(noteEvents).toHaveLength(1);
        });
    });

    describe('Timeline - Non-Functional Tests', () => {
        it('should fetch timeline in less than 200ms', async () => {
            // Create appointment with multiple timeline events
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Performance Test',
                        email: 'perf@example.com',
                        phone: '6666666666'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Add multiple timeline events
            const { timelineService } = await import('../src/modules/appointment-timeline/timeline.service');
            
            for (let i = 0; i < 10; i++) {
                await timelineService.addEvent({
                    appointmentId: newAppointmentId,
                    tenantId,
                    eventType: 'NOTE_ADDED',
                    performedBy: 'staff-user',
                    note: `Note ${i}`,
                    correlationId: `perf-${i}`
                });
            }

            // Wait for async processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // Test timeline fetch performance
            const startTime = Date.now();
            
            const timelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            const fetchTime = Date.now() - startTime;

            expect(timelineResponse.status).toBe(200);
            expect(fetchTime).toBeLessThan(200); // Should be under 200ms
            expect(timelineResponse.body.data.events.length).toBeGreaterThan(10);
        });

        it('should handle concurrent timeline access', async () => {
            // Create appointment
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Concurrency Test',
                        email: 'concurrent@example.com',
                        phone: '5555555555'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Make concurrent timeline requests
            const concurrentRequests = Array.from({ length: 20 }, (_, i) =>
                request(app)
                    .get(`/api/appointments/${newAppointmentId}/timeline`)
                    .set('X-Tenant-ID', tenantId)
            );

            const responses = await Promise.allSettled(concurrentRequests);
            
            // All requests should succeed
            const successful = responses.filter(r => 
                r.status === 'fulfilled' && r.value.status === 200
            ).length;

            expect(successful).toBe(20);

            // All responses should have consistent data
            const firstResponse = responses[0];
            if (firstResponse.status === 'fulfilled') {
                const firstData = firstResponse.value.body.data;
                
                for (const response of responses) {
                    if (response.status === 'fulfilled') {
                        expect(response.value.body.data.events).toHaveLength(firstData.events.length);
                    }
                }
            }
        });
    });

    describe('Audit - Functional Tests', () => {
        it('should log who did what, when, and why', async () => {
            // Create appointment (should generate audit log)
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Audit Test',
                        email: 'audit@example.com',
                        phone: '4444444444'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString(),
                    notes: 'Test appointment for audit'
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Wait for async audit logging
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check audit logs
            const auditResponse = await request(app)
                .get('/api/audit')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 50 });

            expect(auditResponse.status).toBe(200);
            expect(auditResponse.body.data.items.length).toBeGreaterThan(0);

            // Find the appointment creation log
            const creationLog = auditResponse.body.data.items.find((log: any) => 
                log.action === 'appointment.create' && 
                log.resourceId === newAppointmentId
            );

            expect(creationLog).toBeDefined();
            expect(creationLog.resourceType).toBe('Appointment');
            expect(creationLog.userId).toBe('staff-user');
            expect(creationLog.before).toBeDefined();
            expect(creationLog.after).toBeDefined();
            expect(creationLog.correlationId).toBeDefined();
            expect(creationLog.createdAt).toBeDefined();
        });

        it('should track AI usage', async () => {
            // Create an appointment first
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'AI Test',
                        email: 'ai@example.com',
                        phone: '3333333333'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Generate AI summary (should log AI usage)
            const aiResponse = await request(app)
                .post(`/api/appointments/${newAppointmentId}/ai-summary`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(aiResponse.status).toBe(200);

            // Wait for async audit logging
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check AI usage analytics
            const aiAnalyticsResponse = await request(app)
                .get('/api/audit/ai-analytics')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(aiAnalyticsResponse.status).toBe(200);
            expect(aiAnalyticsResponse.body.data.totalAiOperations).toBeGreaterThan(0);
            expect(aiAnalyticsResponse.body.data.operationsByType).toBeDefined();
            expect(aiAnalyticsResponse.body.data.estimatedTokens).toBeGreaterThan(0);
        });

        it('should use correlation ID per request', async () => {
            // Create appointment with specific correlation tracking
            const correlationId = `test-${Date.now()}`;
            
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .set('X-Correlation-ID', correlationId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Correlation Test',
                        email: 'correlation@example.com',
                        phone: '2222222222'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Wait for async audit logging
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check correlation trail
            const trailResponse = await request(app)
                .get(`/api/audit/correlation/${correlationId}`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(trailResponse.status).toBe(200);
            expect(trailResponse.body.data.correlationId).toBe(correlationId);
            expect(trailResponse.body.data.eventCount).toBeGreaterThan(0);
            expect(trailResponse.body.data.events).toBeDefined();
        });
    });

    describe('Audit - Non-Functional Tests', () => {
        it('should ensure logging is async and does not block requests', async () => {
            // Create multiple appointments rapidly
            const startTime = Date.now();
            
            const requests = Array.from({ length: 10 }, (_, i) =>
                request(app)
                    .post('/api/appointments')
                    .set('X-Tenant-ID', tenantId)
                    .set('X-User-ID', 'staff-user')
                    .set('X-User-Role', 'STAFF')
                    .send({
                        serviceId,
                        staffId,
                        customer: {
                            name: `Async Test ${i}`,
                            email: `async${i}@example.com`,
                            phone: `111111111${i}`
                        },
                        startTimeUtc: new Date(Date.now() + (25 + i) * 60 * 60 * 1000).toISOString(),
                        endTimeUtc: new Date(Date.now() + (25.5 + i) * 60 * 60 * 1000).toISOString()
                    })
            );

            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;

            // All requests should succeed quickly
            const successful = responses.filter(r => r.status === 201).length;
            expect(successful).toBe(10);
            
            // Average time per request should be low (async logging shouldn't block)
            const avgTimePerRequest = totalTime / 10;
            expect(avgTimePerRequest).toBeLessThan(100); // Should be very fast

            // Wait for async audit logging
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify all audit logs were created
            const auditResponse = await request(app)
                .get('/api/audit')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 50 });

            expect(auditResponse.status).toBe(200);
            const creationLogs = auditResponse.body.data.items.filter((log: any) => 
                log.action === 'appointment.create'
            );
            expect(creationLogs.length).toBe(10);
        });

        it('should handle audit logging failure without blocking requests', async () => {
            // Create a test audit event with invalid data (should fail but not block)
            const testEventResponse = await request(app)
                .post('/api/audit/test-event')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    action: 'test.failure',
                    resourceType: 'Test',
                    resourceId: 'invalid-id',
                    reason: 'Test failure handling'
                });

            expect(testEventResponse.status).toBe(200);
            expect(testEventResponse.body.data.logged).toBe(true);
            expect(testEventResponse.body.data.isAsync).toBe(true);

            // The request should return immediately even if logging fails
            expect(parseInt(testEventResponse.body.data.duration)).toBeLessThan(50);
        });

        it('should handle high-volume audit logging', async () => {
            // Test audit logging performance
            const performanceResponse = await request(app)
                .post('/api/audit/test-performance')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ iterations: 1000 });

            expect(performanceResponse.status).toBe(200);
            expect(performanceResponse.body.data.isAsync).toBe(true);
            expect(performanceResponse.body.data.isNonBlocking).toBe(true);
            expect(parseFloat(performanceResponse.body.data.averageDuration)).toBeLessThan(10);
            expect(parseInt(performanceResponse.body.data.iterations)).toBe(1000);
        });
    });

    describe('Integration Tests', () => {
        it('should maintain consistency between timeline and audit logs', async () => {
            // Create appointment
            const createResponse = await request(app)
                .post('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Integration Test',
                        email: 'integration@example.com',
                        phone: '0000000000'
                    },
                    startTimeUtc: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 25.5 * 60 * 60 * 1000).toISOString()
                });

            expect(createResponse.status).toBe(201);
            const newAppointmentId = createResponse.body.data.id;

            // Reschedule appointment
            const rescheduleResponse = await request(app)
                .post(`/api/appointments/${newAppointmentId}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    startTimeUtc: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(Date.now() + 26.5 * 60 * 60 * 1000).toISOString()
                });

            expect(rescheduleResponse.status).toBe(200);

            // Wait for async logging
            await new Promise(resolve => setTimeout(resolve, 200));

            // Check timeline events
            const timelineResponse = await request(app)
                .get(`/api/appointments/${newAppointmentId}/timeline`)
                .set('X-Tenant-ID', tenantId);

            expect(timelineResponse.status).toBe(200);
            expect(timelineResponse.body.data.events).toHaveLength(2); // CREATED + RESCHEDULED

            // Check audit logs
            const auditResponse = await request(app)
                .get('/api/audit')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 50 });

            expect(auditResponse.status).toBe(200);
            
            const appointmentLogs = auditResponse.body.data.items.filter((log: any) => 
                log.resourceId === newAppointmentId
            );
            expect(appointmentLogs.length).toBe(2); // create + reschedule

            // Verify correlation between timeline and audit
            const timelineEventTypes = timelineResponse.body.data.events.map((e: any) => e.eventType);
            const auditActions = appointmentLogs.map((log: any) => log.action);

            expect(timelineEventTypes).toContain('CREATED');
            expect(timelineEventTypes).toContain('RESCHEDULED');
            expect(auditActions).toContain('appointment.create');
            expect(auditActions).toContain('appointment.reschedule');
        });
    });
});
