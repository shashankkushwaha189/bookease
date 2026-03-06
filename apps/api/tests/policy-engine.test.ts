import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';

describe('Policy Engine - Comprehensive Tests', () => {
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
        startTimeUtc.setHours(startTimeUtc.getHours() + 25); // 25 hours from now
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
        // Clear policy overrides before each test
        const { policyService } = await import('../src/modules/policy/policy.service');
        policyService.clearPolicyOverrides(tenantId);
    });

    describe('Cancellation Window', () => {
        it('should allow cancellation within allowed window', async () => {
            // Create appointment 25 hours from now (within 24-hour window)
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
                    referenceId: 'BK-2026-00002',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ scope: 'single' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject cancellation outside allowed window', async () => {
            // Create appointment 2 hours from now (outside 24-hour window)
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 2);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00003',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ scope: 'single' });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
            expect(response.body.error.message).toContain('Cancellation window has closed');
        });

        it('should allow admin override outside window with proper reason', async () => {
            // Create appointment 2 hours from now (outside 24-hour window)
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 2);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00004',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    scope: 'single',
                    overrideReason: 'Customer emergency requires cancellation outside normal window'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject admin override without proper reason', async () => {
            // Create appointment 2 hours from now (outside 24-hour window)
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 2);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00005',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    scope: 'single',
                    overrideReason: 'Short' // Less than 10 characters
                });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
            expect(response.body.error.message).toContain('Admin override requires a reason of at least 10 characters');
        });
    });

    describe('Override Logging', () => {
        it('should log admin overrides properly', async () => {
            // Create appointment 2 hours from now (outside 24-hour window)
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 2);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00006',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            // Perform admin override
            await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    scope: 'single',
                    overrideReason: 'Customer emergency requires immediate cancellation due to medical reasons'
                });

            // Check policy overrides
            const overridesResponse = await request(app)
                .get('/api/policy/overrides')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(overridesResponse.status).toBe(200);
            expect(overridesResponse.body.data.count).toBe(1);
            expect(overridesResponse.body.data.overrides[0].action).toBe('cancel');
            expect(overridesResponse.body.data.overrides[0].reason).toBe('Customer emergency requires immediate cancellation due to medical reasons');
            expect(overridesResponse.body.data.overrides[0].appointmentId).toBe(appointment.id);
        });

        it('should track multiple overrides', async () => {
            const { policyService } = await import('../src/modules/policy/policy.service');
            
            // Simulate multiple overrides
            policyService.logPolicyOverride({
                userId: 'admin-user',
                reason: 'First override reason',
                timestamp: new Date(),
                action: 'cancel',
                appointmentId: 'test-appointment-1',
                tenantId: tenantId
            });

            policyService.logPolicyOverride({
                userId: 'admin-user',
                reason: 'Second override reason',
                timestamp: new Date(),
                action: 'reschedule',
                appointmentId: 'test-appointment-2',
                tenantId: tenantId
            });

            const overrides = policyService.getPolicyOverrides(tenantId);
            expect(overrides).toHaveLength(2);
            expect(overrides[0].action).toBe('cancel');
            expect(overrides[1].action).toBe('reschedule');
        });
    });

    describe('Reschedule Limit', () => {
        it('should enforce reschedule limit', async () => {
            // Create appointment
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
                    referenceId: 'BK-2026-00007',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED,
                    rescheduleCount: 3 // Already at limit
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ 
                    scope: 'single',
                    startTimeUtc: new Date(startTimeUtc.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
                    endTimeUtc: new Date(endTimeUtc.getTime() + 60 * 60 * 1000).toISOString()
                });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
            expect(response.body.error.message).toContain('Reschedule limit reached');
        });

        it('should allow admin override for reschedule limit', async () => {
            // Create appointment at reschedule limit
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
                    referenceId: 'BK-2026-00008',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED,
                    rescheduleCount: 3 // Already at limit
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    scope: 'single',
                    startTimeUtc: new Date(startTimeUtc.getTime() + 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(endTimeUtc.getTime() + 60 * 60 * 1000).toISOString(),
                    overrideReason: 'VIP customer requires special accommodation for schedule change'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Grace No-Show Period', () => {
        it('should not mark as no-show during grace period', async () => {
            // Create appointment that just started
            const startTimeUtc = new Date();
            startTimeUtc.setMinutes(startTimeUtc.getMinutes() - 5); // 5 minutes ago
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00009',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            // Test policy service directly
            const { policyService } = await import('../src/modules/policy/policy.service');
            const { configService } = await import('../src/modules/config/config.service');
            const config = await configService.getConfig(tenantId);

            const result = policyService.shouldMarkNoShow(appointment, config);
            
            expect(result.shouldMark).toBe(false);
            expect(result.reason).toBeUndefined();
        });

        it('should mark as no-show after grace period', async () => {
            // Create appointment that started 20 minutes ago (past 15-minute grace period)
            const startTimeUtc = new Date();
            startTimeUtc.setMinutes(startTimeUtc.getMinutes() - 20);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00010',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            // Test policy service directly
            const { policyService } = await import('../src/modules/policy/policy.service');
            const { configService } = await import('../src/modules/config/config.service');
            const config = await configService.getConfig(tenantId);

            const result = policyService.shouldMarkNoShow(appointment, config);
            
            expect(result.shouldMark).toBe(true);
            expect(result.reason).toContain('Grace period of 15 minutes has passed');
        });
    });

    describe('Policy Preview', () => {
        it('should provide policy preview for booking page', async () => {
            const response = await request(app)
                .get('/api/policy/preview')
                .set('X-Tenant-ID', tenantId)
                .query({ currentReschedules: 1 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.cancellationWindow).toBeDefined();
            expect(response.body.data.cancellationWindow.allowedUntilHoursBefore).toBe(24);
            expect(response.body.data.rescheduleLimit).toBeDefined();
            expect(response.body.data.rescheduleLimit.maxReschedules).toBe(3);
            expect(response.body.data.rescheduleLimit.currentReschedules).toBe(1);
            expect(response.body.data.rescheduleLimit.remainingReschedules).toBe(2);
            expect(response.body.data.noShowGracePeriod).toBeDefined();
            expect(response.body.data.noShowGracePeriod.gracePeriodMinutes).toBe(15);
        });
    });

    describe('Performance Requirements', () => {
        it('should enforce policy in less than 200ms', async () => {
            const response = await request(app)
                .post('/api/policy/test')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    testType: 'cancellation',
                    appointmentData: {
                        id: appointmentId,
                        startTimeUtc: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                        tenantId: tenantId
                    },
                    userId: 'test-user',
                    userRole: 'STAFF'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.performanceRequirement).toBe('PASS');
            expect(parseInt(response.body.data.enforcementTime)).toBeLessThan(200);
        });

        it('should handle concurrent policy checks efficiently', async () => {
            const startTime = Date.now();
            
            // Make 50 concurrent policy check requests
            const requests = Array.from({ length: 50 }, (_, i) =>
                request(app)
                    .post('/api/policy/test')
                    .set('X-Tenant-ID', tenantId)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        testType: 'reschedule',
                        appointmentData: {
                            rescheduleCount: i % 3, // Vary reschedule counts
                            id: `test-appointment-${i}`,
                            tenantId: tenantId
                        },
                        userId: 'test-user',
                        userRole: 'STAFF'
                    })
            );

            const responses = await Promise.allSettled(requests);
            const totalTime = Date.now() - startTime;

            // All requests should succeed
            const successful = responses.filter(r => 
                r.status === 'fulfilled' && r.value.status === 200
            ).length;

            expect(successful).toBe(50);
            
            // Average time per request should be reasonable
            const avgTimePerRequest = totalTime / 50;
            expect(avgTimePerRequest).toBeLessThan(50); // Less than 50ms per request on average
        });
    });

    describe('Policy Update Validation', () => {
        it('should validate policy changes without corrupting historical data', async () => {
            const response = await request(app)
                .post('/api/policy/validate-update')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    newConfig: {
                        booking: {
                            maxBookingsPerDay: 50,
                            slotLockDurationMinutes: 25,
                            allowGuestBooking: true
                        },
                        cancellation: {
                            allowedUntilHoursBefore: 48, // Increased from 24
                            maxReschedules: 2, // Decreased from 3
                            noShowGracePeriodMinutes: 10 // Changed from 15
                        },
                        features: {
                            aiSummaryEnabled: false,
                            loadBalancingEnabled: false,
                            recurringEnabled: true
                        },
                        staff: {
                            canCancelAppointments: true,
                            canRescheduleAppointments: true
                        }
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.data.valid).toBe(true);
            expect(response.body.data.warnings).toHaveLength(3);
            expect(response.body.data.warnings[0]).toContain('Cancellation window extended');
            expect(response.body.data.warnings[1]).toContain('Reschedule limit reduced');
            expect(response.body.data.warnings[2]).toContain('No-show grace period changed');
        });
    });

    describe('Edge Cases', () => {
        it('should handle edge case of exactly at cancellation window boundary', async () => {
            // Create appointment exactly 24 hours from now
            const startTimeUtc = new Date();
            startTimeUtc.setHours(startTimeUtc.getHours() + 24);
            const endTimeUtc = new Date(startTimeUtc);
            endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00011',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ scope: 'single' });

            // Should be allowed (exactly at boundary)
            expect(response.status).toBe(200);
        });

        it('should handle zero reschedule count', async () => {
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
                    referenceId: 'BK-2026-00012',
                    startTimeUtc,
                    endTimeUtc,
                    status: AppointmentStatus.BOOKED,
                    rescheduleCount: 0
                }
            });

            const response = await request(app)
                .post(`/api/appointments/${appointment.id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'staff-user')
                .set('X-User-Role', 'STAFF')
                .send({ 
                    scope: 'single',
                    startTimeUtc: new Date(startTimeUtc.getTime() + 60 * 60 * 1000).toISOString(),
                    endTimeUtc: new Date(endTimeUtc.getTime() + 60 * 60 * 1000).toISOString()
                });

            expect(response.status).toBe(200);
        });
    });
});
