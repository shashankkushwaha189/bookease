import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { RecurringFrequency, AppointmentStatus } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';
import { addWeeks, addMonths } from 'date-fns';

describe('Recurring Appointments - Comprehensive Tests', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;
    let customerId: string;
    let adminToken: string;
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
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    beforeEach(async () => {
        // Clean up appointments and series before each test
        await prisma.appointment.deleteMany({ where: { tenantId } });
        await prisma.recurringAppointmentSeries.deleteMany({ where: { tenantId } });
    });

    describe('Weekly Recurrence', () => {
        it('should generate correct weekly recurring dates', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z'); // Monday
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Weekly Patient',
                        email: 'weekly@example.com',
                        phone: '1111111111'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 4
                    },
                    notes: 'Weekly therapy sessions'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.appointments).toHaveLength(4);

            const appointments = response.body.data.appointments;
            
            // Check weekly intervals
            for (let i = 0; i < 4; i++) {
                const expectedDate = addWeeks(startTimeUtc, i);
                expect(appointments[i].startTimeUtc).toBe(expectedDate.toISOString());
                expect(appointments[i].seriesIndex).toBe(i);
                expect(appointments[i].referenceId).toMatch(/^BK-\d{4}-\d{5}$/);
            }

            // Verify series metadata
            expect(response.body.data.series.frequency).toBe('WEEKLY');
            expect(response.body.data.series.occurrences).toBe(4);
        });

        it('should handle performance requirement for weekly recurrence', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const startTime = Date.now();

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Performance Test',
                        email: 'perf@example.com',
                        phone: '2222222222'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 52 // Full year
                    },
                    notes: 'Performance test - full year'
                });

            const generationTime = Date.now() - startTime;

            expect(response.status).toBe(201);
            expect(generationTime).toBeLessThan(1000); // Less than 1 second
            expect(response.body.data.appointments).toHaveLength(52);
        });
    });

    describe('Bi-weekly Recurrence', () => {
        it('should generate correct bi-weekly recurring dates', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z'); // Monday
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Bi-weekly Patient',
                        email: 'biweekly@example.com',
                        phone: '3333333333'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'BIWEEKLY',
                        occurrences: 3
                    },
                    notes: 'Bi-weekly checkups'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(3);

            const appointments = response.body.data.appointments;
            
            // Check bi-weekly intervals (every 2 weeks)
            for (let i = 0; i < 3; i++) {
                const expectedDate = addWeeks(startTimeUtc, i * 2);
                expect(appointments[i].startTimeUtc).toBe(expectedDate.toISOString());
                expect(appointments[i].seriesIndex).toBe(i);
            }

            // Verify series metadata
            expect(response.body.data.series.frequency).toBe('BIWEEKLY');
            expect(response.body.data.series.occurrences).toBe(3);
        });
    });

    describe('Monthly Recurrence', () => {
        it('should generate correct monthly recurring dates', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z'); // March 2nd
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Monthly Patient',
                        email: 'monthly@example.com',
                        phone: '4444444444'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'MONTHLY',
                        occurrences: 6
                    },
                    notes: 'Monthly follow-ups'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(6);

            const appointments = response.body.data.appointments;
            
            // Check monthly intervals
            for (let i = 0; i < 6; i++) {
                const expectedDate = addMonths(startTimeUtc, i);
                expect(appointments[i].startTimeUtc).toBe(expectedDate.toISOString());
                expect(appointments[i].seriesIndex).toBe(i);
            }

            // Verify series metadata
            expect(response.body.data.series.frequency).toBe('MONTHLY');
            expect(response.body.data.series.occurrences).toBe(6);
        });
    });

    describe('Fixed Occurrences', () => {
        it('should validate occurrence limits', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            // Test invalid occurrence count (too high)
            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Invalid Test',
                        email: 'invalid@example.com',
                        phone: '5555555555'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 105 // Exceeds limit of 104
                    }
                });

            expect(response.status).toBe(500);
            expect(response.body.error.message).toContain('INVALID_OCCURRENCES');
        });

        it('should handle minimum occurrence count', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Single Occurrence',
                        email: 'single@example.com',
                        phone: '6666666666'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 1
                    },
                    notes: 'Single appointment as series'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(1);
            expect(response.body.data.series.occurrences).toBe(1);
        });
    });

    describe('Cancel Single Instance', () => {
        it('should cancel single instance without affecting series', async () => {
            // Create recurring series
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const createResponse = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Cancel Test',
                        email: 'cancel@example.com',
                        phone: '7777777777'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 4
                    },
                    notes: 'Series for cancel test'
                });

            expect(createResponse.status).toBe(201);
            const appointments = createResponse.body.data.appointments;
            const seriesId = createResponse.body.data.series.id;

            // Cancel the second appointment only
            const cancelResponse = await request(app)
                .post(`/api/appointments/${appointments[1].id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({ scope: 'single' });

            expect(cancelResponse.status).toBe(200);

            // Verify only the second appointment is cancelled
            const updatedAppointments = await prisma.appointment.findMany({
                where: { seriesId },
                orderBy: { seriesIndex: 'asc' }
            });

            expect(updatedAppointments[0].status).toBe('BOOKED');
            expect(updatedAppointments[1].status).toBe('CANCELLED');
            expect(updatedAppointments[2].status).toBe('BOOKED');
            expect(updatedAppointments[3].status).toBe('BOOKED');
        });
    });

    describe('Cancel Entire Series', () => {
        it('should cancel entire series from specified index', async () => {
            // Create recurring series
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const createResponse = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Series Cancel Test',
                        email: 'seriescancel@example.com',
                        phone: '8888888888'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 5
                    },
                    notes: 'Series for entire cancel test'
                });

            expect(createResponse.status).toBe(201);
            const appointments = createResponse.body.data.appointments;
            const seriesId = createResponse.body.data.series.id;

            // Cancel from the third appointment onwards (index 2)
            const cancelResponse = await request(app)
                .post(`/api/appointments/${appointments[2].id}/cancel`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({ scope: 'series' });

            expect(cancelResponse.status).toBe(200);
            expect(cancelResponse.body.data.count).toBe(3); // Appointments 2, 3, 4 cancelled

            // Verify cancellation pattern
            const updatedAppointments = await prisma.appointment.findMany({
                where: { seriesId },
                orderBy: { seriesIndex: 'asc' }
            });

            expect(updatedAppointments[0].status).toBe('BOOKED');   // Index 0 - kept
            expect(updatedAppointments[1].status).toBe('BOOKED');   // Index 1 - kept
            expect(updatedAppointments[2].status).toBe('CANCELLED'); // Index 2 - cancelled
            expect(updatedAppointments[3].status).toBe('CANCELLED'); // Index 3 - cancelled
            expect(updatedAppointments[4].status).toBe('CANCELLED'); // Index 4 - cancelled
        });
    });

    describe('Edit Series', () => {
        it('should reschedule entire series from specified index', async () => {
            // Create recurring series
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const createResponse = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Series Edit Test',
                        email: 'seriesedit@example.com',
                        phone: '9999999999'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 4
                    },
                    notes: 'Series for edit test'
                });

            expect(createResponse.status).toBe(201);
            const appointments = createResponse.body.data.appointments;
            const seriesId = createResponse.body.data.series.id;

            // Reschedule from the second appointment onwards to 2 hours later
            const newStartTime = new Date(appointments[1].startTimeUtc);
            newStartTime.setHours(newStartTime.getHours() + 2);
            const newEndTime = new Date(newStartTime);
            newEndTime.setMinutes(newEndTime.getMinutes() + 30);

            const rescheduleResponse = await request(app)
                .post(`/api/appointments/${appointments[1].id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({ 
                    scope: 'series',
                    startTimeUtc: newStartTime.toISOString(),
                    endTimeUtc: newEndTime.toISOString()
                });

            expect(rescheduleResponse.status).toBe(200);
            expect(rescheduleResponse.body.data.count).toBe(3); // Appointments 1, 2, 3 rescheduled

            // Verify reschedule pattern
            const updatedAppointments = await prisma.appointment.findMany({
                where: { seriesId },
                orderBy: { seriesIndex: 'asc' }
            });

            // First appointment unchanged
            expect(updatedAppointments[0].startTimeUtc).toBe(appointments[0].startTimeUtc);

            // Subsequent appointments shifted by 2 hours
            for (let i = 1; i < 4; i++) {
                const expectedTime = new Date(appointments[i].startTimeUtc);
                expectedTime.setHours(expectedTime.getHours() + 2);
                expect(updatedAppointments[i].startTimeUtc).toBe(expectedTime.toISOString());
            }
        });

        it('should handle series edit conflicts', async () => {
            // Create recurring series
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const createResponse = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Conflict Test',
                        email: 'conflict@example.com',
                        phone: '0000000000'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 3
                    }
                });

            expect(createResponse.status).toBe(201);
            const appointments = createResponse.body.data.appointments;

            // Create a conflicting appointment at the target time
            const conflictTime = new Date(appointments[1].startTimeUtc);
            conflictTime.setHours(conflictTime.getHours() + 1);

            await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-2026-00001',
                    startTimeUtc: conflictTime,
                    endTimeUtc: new Date(conflictTime.getTime() + 30 * 60000),
                    status: AppointmentStatus.BOOKED
                }
            });

            // Try to reschedule to conflicting time
            const rescheduleResponse = await request(app)
                .post(`/api/appointments/${appointments[1].id}/reschedule`)
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .set('X-User-Role', 'ADMIN')
                .send({ 
                    scope: 'series',
                    startTimeUtc: conflictTime.toISOString(),
                    endTimeUtc: new Date(conflictTime.getTime() + 30 * 60000).toISOString()
                });

            expect(rescheduleResponse.status).toBe(409);
            expect(rescheduleResponse.body.error.code).toBe('RESCHEDULE_CONFLICT');
        });
    });

    describe('Performance Requirements', () => {
        it('should generate recurrence in less than 1 second', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            const startTime = Date.now();

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Performance Test',
                        email: 'perf@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 100 // Large series
                    },
                    notes: 'Performance test - 100 occurrences'
                });

            const generationTime = Date.now() - startTime;

            expect(response.status).toBe(201);
            expect(generationTime).toBeLessThan(1000); // Less than 1 second
            expect(response.body.data.appointments).toHaveLength(100);
        });

        it('should avoid exponential DB writes', async () => {
            const startTimeUtc = new Date('2026-03-02T10:00:00.000Z');
            const endTimeUtc = new Date('2026-03-02T10:30:00.000Z');

            // Monitor database operations
            const dbQueryCount = jest.spyOn(prisma.appointment, 'create');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'DB Test',
                        email: 'dbtest@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 50
                    },
                    notes: 'DB write test'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(50);

            // Should have exactly 50 appointment creates + 1 series create = 51 total
            expect(dbQueryCount).toHaveBeenCalledTimes(50);

            dbQueryCount.mockRestore();
        });
    });

    describe('Edge Cases', () => {
        it('should handle cross-year recurring series', async () => {
            const startTimeUtc = new Date('2026-12-01T10:00:00.000Z'); // December
            const endTimeUtc = new Date('2026-12-01T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'Cross Year Test',
                        email: 'crossyear@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'MONTHLY',
                        occurrences: 3 // Dec, Jan, Feb
                    },
                    notes: 'Cross year test'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(3);

            const appointments = response.body.data.appointments;
            
            // Verify dates span across years
            expect(new Date(appointments[0].startTimeUtc).getFullYear()).toBe(2026);
            expect(new Date(appointments[1].startTimeUtc).getFullYear()).toBe(2027);
            expect(new Date(appointments[2].startTimeUtc).getFullYear()).toBe(2027);
        });

        it('should handle daylight saving time transitions', async () => {
            // Using UTC timezone, DST shouldn't affect the calculation
            const startTimeUtc = new Date('2026-03-08T10:00:00.000Z'); // Around DST transition
            const endTimeUtc = new Date('2026-03-08T10:30:00.000Z');

            const response = await request(app)
                .post('/api/appointments/recurring')
                .set('X-Tenant-ID', tenantId)
                .set('X-User-ID', 'admin-user')
                .send({
                    serviceId,
                    staffId,
                    customer: {
                        name: 'DST Test',
                        email: 'dst@example.com',
                        phone: '1234567890'
                    },
                    startTimeUtc: startTimeUtc.toISOString(),
                    endTimeUtc: endTimeUtc.toISOString(),
                    recurring: {
                        frequency: 'WEEKLY',
                        occurrences: 4
                    },
                    notes: 'DST transition test'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.appointments).toHaveLength(4);

            // All times should remain at 10:00 UTC regardless of DST
            const appointments = response.body.data.appointments;
            for (const appointment of appointments) {
                expect(new Date(appointment.startTimeUtc).getUTCHours()).toBe(10);
            }
        });
    });
});
