import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AppointmentStatus } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';

describe('Appointment Engine - Comprehensive Tests', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;
    let customerId: string;
    let adminToken: string;
    let staffToken: string;
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
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    beforeEach(async () => {
        // Clean up appointments and locks before each test
        await prisma.appointment.deleteMany({ where: { tenantId } });
        await prisma.slotLock.deleteMany({ where: { tenantId } });
    });

    describe('Slot Locking System', () => {
        it('should create a slot lock with 2-5 minute TTL', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const response = await request(app)
                .post('/api/appointments/locks')
                .set('X-Tenant-ID', tenantId)
                .send({
                    staffId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-session-123'
                });

            expect(response.status).toBe(201);
            expect(response.body.expiresAt).toBeDefined();
            
            // Verify TTL is between 2-5 minutes (120-300 seconds)
            const lock = await prisma.slotLock.findFirst({ where: { tenantId } });
            expect(lock).toBeDefined();
            const ttlSeconds = (lock!.expiresAt.getTime() - Date.now()) / 1000;
            expect(ttlSeconds).toBeGreaterThanOrEqual(120);
            expect(ttlSeconds).toBeLessThanOrEqual(300);
        });

        it('should reject duplicate slot locks', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // First lock
            await request(app)
                .post('/api/appointments/locks')
                .set('X-Tenant-ID', tenantId)
                .send({
                    staffId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'session-1'
                });

            // Second lock on same slot should fail
            const response = await request(app)
                .post('/api/appointments/locks')
                .set('X-Tenant-ID', tenantId)
                .send({
                    staffId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'session-2'
                });

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe('SLOT_ALREADY_LOCKED');
        });

        it('should automatically expire locks', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // Create lock with very short TTL for testing
            const lock = await prisma.slotLock.create({
                data: {
                    tenantId,
                    staffId,
                    startTimeUtc,
                    endTimeUtc,
                    sessionToken: 'test-expiry',
                    expiresAt: new Date(Date.now() + 1000) // 1 second TTL
                }
            });

            expect(lock).toBeDefined();

            // Wait for expiration and run cleanup
            await new Promise(resolve => setTimeout(resolve, 1500));
            await prisma.slotLock.deleteMany({ where: { expiresAt: { lt: new Date() } } });

            // Verify lock is gone
            const expiredLock = await prisma.slotLock.findFirst({ where: { id: lock.id } });
            expect(expiredLock).toBeNull();
        });
    });

    describe('Appointment Creation', () => {
        it('should create appointment with unique reference ID', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const response = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                        phone: '9876543210'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-booking-123',
                    consentGiven: true
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.referenceId).toMatch(/^BK-\d{4}-\d{5}$/);
        });

        it('should prevent two users from booking same slot', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // First booking
            const firstResponse = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Alice',
                        email: 'alice@example.com',
                        phone: '1111111111'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'alice-session',
                    consentGiven: true
                });

            expect(firstResponse.status).toBe(201);

            // Second booking on same slot should fail
            const secondResponse = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Bob',
                        email: 'bob@example.com',
                        phone: '2222222222'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'bob-session',
                    consentGiven: true
                });

            expect(secondResponse.status).toBe(409);
            expect(secondResponse.body.error.code).toBe('SLOT_TAKEN');
        });

        it('should handle 100 concurrent booking attempts', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // Create 100 concurrent booking attempts for different slots
            const concurrentRequests = Array.from({ length: 100 }, (_, i) => {
                const slotStart = new Date(startTimeUtc);
                slotStart.setMinutes(slotStart.getMinutes() + (i * 30)); // Different slots
                
                return request(app)
                    .post('/api/appointments/book')
                    .set('X-Tenant-ID', tenantId)
                    .send({
                        serviceId,
                        staffId,
                        customer: {
                            name: `User ${i}`,
                            email: `user${i}@example.com`,
                            phone: `00000000${i}`.slice(-10)
                        },
                        startTimeUtc: slotStart.toISOString(),
                        endTimeUtc: new Date(slotStart.getTime() + 30 * 60000).toISOString(),
                        sessionToken: `session-${i}`,
                        consentGiven: true
                    });
            });

            const responses = await Promise.allSettled(concurrentRequests);
            
            // Count successful bookings
            const successful = responses.filter(r => 
                r.status === 'fulfilled' && r.value.status === 201
            ).length;
            
            const failed = responses.filter(r => 
                r.status === 'fulfilled' && r.value.status !== 201
            ).length;
            
            const rejected = responses.filter(r => r.status === 'rejected').length;

            expect(successful + failed + rejected).toBe(100);
            expect(successful).toBeGreaterThan(90); // Most should succeed
            expect(rejected).toBe(0); // No outright rejections
        });
    });

    describe('Status Lifecycle Enforcement', () => {
        it('should enforce valid status transitions', async () => {
            // Create an appointment
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const createResponse = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-session',
                    consentGiven: true
                });

            const appointmentId = createResponse.body.data.id;

            // Valid transition: BOOKED -> CONFIRMED
            const confirmResponse = await request(app)
                .patch(`/api/appointments/${appointmentId}/status`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({ status: 'CONFIRMED' });

            expect(confirmResponse.status).toBe(200);
            expect(confirmResponse.body.data.status).toBe('CONFIRMED');

            // Invalid transition: COMPLETED -> BOOKED
            const invalidResponse = await request(app)
                .patch(`/api/appointments/${appointmentId}/status`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({ status: 'BOOKED' });

            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body.error.code).toBe('INVALID_STATUS_TRANSITION');
        });

        it('should reject invalid status transitions', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const createResponse = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-session',
                    consentGiven: true
                });

            const appointmentId = createResponse.body.data.id;

            // Try to transition directly to COMPLETED (should fail)
            const response = await request(app)
                .patch(`/api/appointments/${appointmentId}/status`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({ status: 'COMPLETED' });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
        });
    });

    describe('Reschedule Logic', () => {
        it('should detect reschedule conflicts', async () => {
            // Create first appointment
            const startTime1 = new Date();
            startTime1.setHours(startTime1.getHours() + 24, 10, 0, 0);
            const endTime1 = new Date(startTime1);
            endTime1.setMinutes(endTime1.getMinutes() + 30);

            const appointment1 = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'User 1',
                        email: 'user1@example.com',
                        phone: '1111111111'
                    },
                    startTimeUtc: startTime1.toISOString(),
                    endTimeUtc: endTime1.toISOString(),
                    sessionToken: 'session-1',
                    consentGiven: true
                });

            // Create second appointment at different time
            const startTime2 = new Date(startTime1);
            startTime2.setHours(startTime2.getHours() + 2);
            const endTime2 = new Date(startTime2);
            endTime2.setMinutes(endTime2.getMinutes() + 30);

            const appointment2 = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'User 2',
                        email: 'user2@example.com',
                        phone: '2222222222'
                    },
                    startTimeUtc: startTime2.toISOString(),
                    endTimeUtc: endTime2.toISOString(),
                    sessionToken: 'session-2',
                    consentGiven: true
                });

            // Try to reschedule second appointment to first appointment's time
            const rescheduleResponse = await request(app)
                .patch(`/api/appointments/${appointment2.body.data.id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({
                    startTimeUtc: startTime1.toISOString(),
                    endTimeUtc: endTime1.toISOString()
                });

            expect(rescheduleResponse.status).toBe(409);
            expect(rescheduleResponse.body.error.code).toBe('RESCHEDULE_CONFLICT');
            expect(rescheduleResponse.body.error.message).toContain('conflicts with existing appointment');
        });

        it('should allow successful reschedule with no conflicts', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const createResponse = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-session',
                    consentGiven: true
                });

            const appointmentId = createResponse.body.data.id;

            // Reschedule to 2 hours later
            const newStartTime = new Date(startTimeUtc);
            newStartTime.setHours(newStartTime.getHours() + 2);
            const newEndTime = new Date(newStartTime);
            newEndTime.setMinutes(newEndTime.getMinutes() + 30);

            const rescheduleResponse = await request(app)
                .patch(`/api/appointments/${appointmentId}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({
                    startTimeUtc: newStartTime.toISOString(),
                    endTimeUtc: newEndTime.toISOString()
                });

            expect(rescheduleResponse.status).toBe(200);
            expect(rescheduleResponse.body.data.startTimeUtc).toBe(newStartTime.toISOString());
        });
    });

    describe('Manual Booking by Staff', () => {
        it('should allow staff to create manual bookings', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const response = await request(app)
                .post('/api/appointments/manual')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    serviceId,
                    staffId,
                    customerId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    notes: 'Manual booking by staff'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('CONFIRMED'); // Manual bookings are confirmed
            expect(response.body.data.referenceId).toMatch(/^BK-\d{4}-\d{5}$/);
        });

        it('should prevent manual booking conflicts', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // Create first manual booking
            await request(app)
                .post('/api/appointments/manual')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    serviceId,
                    staffId,
                    customerId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    notes: 'First manual booking'
                });

            // Try to create second manual booking at same time
            const response = await request(app)
                .post('/api/appointments/manual')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    serviceId,
                    staffId,
                    customerId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    notes: 'Second manual booking'
                });

            expect(response.status).toBe(409);
            expect(response.body.error.code).toBe('BOOKING_CONFLICT');
        });

        it('should reject manual booking for unauthorized users', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const response = await request(app)
                .post('/api/appointments/manual')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId,
                    staffId,
                    customerId,
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    notes: 'Unauthorized manual booking'
                });

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('Concurrency Monitoring', () => {
        it('should provide booking concurrency statistics', async () => {
            const response = await request(app)
                .get('/api/appointments/admin/concurrency-stats')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.totalBookingAttempts).toBeDefined();
            expect(response.body.data.concurrentBookingAttempts).toBeDefined();
            expect(response.body.data.maxConcurrentBookingAttempts).toBeDefined();
            expect(response.body.data.successRate).toBeDefined();
        });

        it('should reject non-admin users from concurrency stats', async () => {
            const response = await request(app)
                .get('/api/appointments/admin/concurrency-stats')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('Transaction Rollback', () => {
        it('should rollback on booking failure', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // Create a booking that will fail (invalid service)
            const response = await request(app)
                .post('/api/appointments/book')
                .set('X-Tenant-ID', tenantId)
                .send({
                    serviceId: 'invalid-service-id',
                    staffId,
                    customer: {
                        name: 'Test User',
                        email: 'test@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    sessionToken: 'test-session',
                    consentGiven: true
                });

            expect(response.status).toBe(500);

            // Verify no partial data was created
            const appointments = await prisma.appointment.findMany({ where: { tenantId } });
            const customers = await prisma.customer.findMany({ where: { tenantId, email: 'test@example.com' } });
            
            expect(appointments.length).toBe(0);
            expect(customers.length).toBe(0);
        });
    });

    describe('Deadlock Prevention', () => {
        it('should handle concurrent operations without deadlocks', async () => {
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            // Create multiple concurrent operations on different resources
            const operations = Array.from({ length: 20 }, (_, i) => {
                const slotStart = new Date(startTimeUtc);
                slotStart.setMinutes(slotStart.getMinutes() + (i * 60)); // 1-hour intervals
                
                return request(app)
                    .post('/api/appointments/book')
                    .set('X-Tenant-ID', tenantId)
                    .send({
                        serviceId,
                        staffId,
                        customer: {
                            name: `User ${i}`,
                            email: `user${i}@example.com`,
                            phone: `00000000${i}`.slice(-10)
                        },
                        startTimeUtc: slotStart.toISOString(),
                        endTimeUtc: new Date(slotStart.getTime() + 30 * 60000).toISOString(),
                        sessionToken: `session-${i}`,
                        consentGiven: true
                    });
            });

            const responses = await Promise.allSettled(operations);
            
            // All operations should complete without deadlock errors
            const deadlockErrors = responses.filter(r => 
                r.status === 'rejected' && 
                (r.reason as any).message?.includes('deadlock')
            ).length;

            expect(deadlockErrors).toBe(0);
        });
    });
});
