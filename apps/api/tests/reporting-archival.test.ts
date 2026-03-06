import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';

describe('Reporting & Archival - Comprehensive Tests', () => {
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

        // Create service with price
        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Consultation',
                durationMinutes: 30,
                bufferBefore: 5,
                bufferAfter: 5,
                price: 150.00
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
        // Clean up test data
        await prisma.appointment.deleteMany({ where: { tenantId } });
        await prisma.appointmentArchive.deleteMany({ where: { tenantId } });
    });

    describe('REPORTING - Functional Tests', () => {
        it('should generate accurate report aggregations', async () => {
            // Create test appointments with different statuses
            const appointments = [];
            const baseTime = new Date();
            baseTime.setHours(baseTime.getHours() + 24); // Tomorrow

            // Create completed appointments
            for (let i = 0; i < 5; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-2026-COMPLETE-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
                appointments.push(appointment);
            }

            // Create cancelled appointments
            for (let i = 0; i < 2; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-2026-CANCEL-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + (i + 10) * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 11) * 60 * 60 * 1000),
                        status: AppointmentStatus.CANCELLED
                    }
                });
                appointments.push(appointment);
            }

            // Create no-show appointments
            for (let i = 0; i < 1; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-2026-NOSHOW-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + (i + 20) * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 21) * 60 * 60 * 1000),
                        status: AppointmentStatus.NO_SHOW
                    }
                });
                appointments.push(appointment);
            }

            // Generate report
            const fromDate = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
            const toDate = new Date(baseTime.getTime() + 48 * 60 * 60 * 1000);

            const reportResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });

            expect(reportResponse.status).toBe(200);
            const summary = reportResponse.body.data;

            // Verify aggregations
            expect(summary.totalAppointments).toBe(8); // 5 + 2 + 1
            expect(summary.completedCount).toBe(5);
            expect(summary.cancelledCount).toBe(2);
            expect(summary.noShowCount).toBe(1);
            expect(summary.noShowRate).toBe(12.5); // 1/8 * 100

            // Verify service aggregations
            expect(summary.bookingsByService).toHaveLength(1);
            expect(summary.bookingsByService[0].name).toBe('Consultation');
            expect(summary.bookingsByService[0].count).toBe(8);
            expect(summary.bookingsByService[0].percentage).toBe(100);

            // Verify staff aggregations
            expect(summary.bookingsByStaff).toHaveLength(1);
            expect(summary.bookingsByStaff[0].name).toBe('Dr. Smith');
            expect(summary.bookingsByStaff[0].count).toBe(8);
            expect(summary.bookingsByStaff[0].percentage).toBe(100);
        });

        it('should generate peak booking times analysis', async () => {
            // Create appointments at specific times
            const baseDate = new Date();
            baseDate.setDate(baseDate.getDate() + 1); // Tomorrow
            baseDate.setHours(9, 0, 0, 0); // 9 AM

            // Create appointments at 9 AM on different days
            for (let day = 0; day < 3; day++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-PEAK-${day}`,
                        startTimeUtc: new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
            }

            // Generate peak times report
            const fromDate = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
            const toDate = new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000);

            const peakResponse = await request(app)
                .get('/api/reports/peak-times')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });

            expect(peakResponse.status).toBe(200);
            const peakTimes = peakResponse.body.data;

            // Should have 168 entries (7 days * 24 hours)
            expect(peakTimes).toHaveLength(168);

            // Find 9 AM entries
            const nineAmEntries = peakTimes.filter((entry: any) => entry.hour === 9);
            expect(nineAmEntries).toHaveLength(7); // One for each day

            // Should have 3 appointments at 9 AM
            const totalNineAm = nineAmEntries.reduce((sum: number, entry: any) => sum + entry.count, 0);
            expect(totalNineAm).toBe(3);
        });

        it('should generate staff utilization report', async () => {
            // Create staff with weekly schedule
            const testStaff = await prisma.staff.create({
                data: {
                    tenantId,
                    name: 'Dr. Jones',
                    email: 'jones@clinic.com',
                    weeklySchedule: {
                        create: [
                            { dayOfWeek: 1, isWorking: true, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 3, isWorking: true, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 4, isWorking: true, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 5, isWorking: true, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 6, isWorking: false, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '17:00' }
                        ]
                    }
                }
            });

            // Create appointments for this staff
            const baseTime = new Date();
            baseTime.setDate(baseTime.getDate() + 1); // Tomorrow
            baseTime.setHours(10, 0, 0, 0); // 10 AM

            for (let i = 0; i < 5; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId: testStaff.id,
                        customerId,
                        referenceId: `BK-UTIL-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
            }

            // Generate utilization report
            const fromDate = new Date(baseTime.getTime() - 7 * 24 * 60 * 60 * 1000);
            const toDate = new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000);

            const utilResponse = await request(app)
                .get('/api/reports/staff-utilization')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });

            expect(utilResponse.status).toBe(200);
            const utilization = utilResponse.body.data;

            // Should include both staff members
            expect(utilization).toHaveLength(2);

            // Find Dr. Jones
            const drJones = utilization.find((staff: any) => staff.name === 'Dr. Jones');
            expect(drJones).toBeDefined();
            expect(drJones.bookedSlots).toBe(5);
            expect(drJones.totalSlots).toBeGreaterThan(0);
            expect(drJones.utilizationPct).toBeGreaterThan(0);
            expect(drJones.efficiency).toBe(100); // All completed
        });

        it('should export CSV data that matches source data', async () => {
            // Create test appointments
            const appointments = [];
            const baseTime = new Date();
            baseTime.setHours(baseTime.getHours() + 24);

            for (let i = 0; i < 3; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-EXPORT-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED,
                        notes: `Test notes ${i}`
                    }
                });
                appointments.push(appointment);
            }

            // Export appointments
            const exportResponse = await request(app)
                .get('/api/reports/export')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    type: 'appointments',
                    from: new Date(baseTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    to: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

            expect(exportResponse.status).toBe(200);
            expect(exportResponse.headers['content-type']).toBe('text/csv');
            expect(exportResponse.headers['content-disposition']).toContain('attachment');
            expect(exportResponse.headers['x-record-count']).toBe('3');
            expect(exportResponse.headers['x-validation-status']).toBe('VALID');

            const csvData = exportResponse.text;
            
            // Verify CSV structure
            const lines = csvData.split('\n');
            expect(lines.length).toBeGreaterThan(1); // Header + data
            
            const headers = lines[0];
            expect(headers).toContain('Reference ID');
            expect(headers).toContain('Customer Name');
            expect(headers).toContain('Service');
            expect(headers).toContain('Staff');
            expect(headers).toContain('Status');

            // Verify data rows
            const dataLines = lines.slice(1).filter(line => line.trim());
            expect(dataLines).toHaveLength(3);

            // Verify specific appointment data
            expect(csvData).toContain('BK-EXPORT-0');
            expect(csvData).toContain('John Doe');
            expect(csvData).toContain('Consultation');
            expect(csvData).toContain('Dr. Smith');
            expect(csvData).toContain('COMPLETED');

            // Validate CSV integrity
            const validationResponse = await request(app)
                .post('/api/reports/validate-csv')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'appointments',
                    csvData
                });

            expect(validationResponse.status).toBe(200);
            expect(validationResponse.body.data.isValid).toBe(true);
            expect(validationResponse.body.data.recordCount).toBe(3);
            expect(validationResponse.body.data.issues).toHaveLength(0);
        });
    });

    describe('REPORTING - Non-Functional Tests', () => {
        it('should generate reports in less than 2 seconds', async () => {
            // Create a reasonable amount of test data
            const baseTime = new Date();
            baseTime.setHours(baseTime.getHours() + 24);

            for (let i = 0; i < 50; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-PERF-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: i % 3 === 0 ? AppointmentStatus.COMPLETED : 
                                i % 3 === 1 ? AppointmentStatus.CANCELLED : AppointmentStatus.NO_SHOW
                    }
                });
            }

            const fromDate = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
            const toDate = new Date(baseTime.getTime() + 48 * 60 * 60 * 1000);

            // Test summary report
            const summaryStart = Date.now();
            const summaryResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });
            const summaryTime = Date.now() - summaryStart;

            expect(summaryResponse.status).toBe(200);
            expect(summaryTime).toBeLessThan(2000);
            expect(summaryResponse.body.meta.performanceRequirement).toBe('PASS');

            // Test peak times report
            const peakStart = Date.now();
            const peakResponse = await request(app)
                .get('/api/reports/peak-times')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });
            const peakTime = Date.now() - peakStart;

            expect(peakResponse.status).toBe(200);
            expect(peakTime).toBeLessThan(2000);
            expect(peakResponse.body.meta.performanceRequirement).toBe('PASS');

            // Test staff utilization report
            const utilStart = Date.now();
            const utilResponse = await request(app)
                .get('/api/reports/staff-utilization')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0] 
                });
            const utilTime = Date.now() - utilStart;

            expect(utilResponse.status).toBe(200);
            expect(utilTime).toBeLessThan(2000);
            expect(utilResponse.body.meta.performanceRequirement).toBe('PASS');
        });

        it('should enforce pagination limits', async () => {
            // Create test data
            const baseTime = new Date();
            baseTime.setHours(baseTime.getHours() + 24);

            for (let i = 0; i < 25; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-PAGE-${i}`,
                        startTimeUtc: new Date(baseTime.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(baseTime.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
            }

            const fromDate = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
            const toDate = new Date(baseTime.getTime() + 48 * 60 * 60 * 1000);

            // Test with limit
            const limitedResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0],
                    limit: 10
                });

            expect(limitedResponse.status).toBe(200);
            expect(limitedResponse.body.meta.limit).toBe(10);
            expect(limitedResponse.body.meta.page).toBe(1);

            // Test invalid limit
            const invalidResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0],
                    limit: 2000 // Over limit
                });

            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body.error.code).toBe('INVALID_LIMIT');

            // Test invalid page
            const invalidPageResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: fromDate.toISOString().split('T')[0], 
                    to: toDate.toISOString().split('T')[0],
                    page: 0 // Invalid page
                });

            expect(invalidPageResponse.status).toBe(400);
            expect(invalidPageResponse.body.error.code).toBe('INVALID_PAGE');
        });
    });

    describe('ARCHIVAL - Functional Tests', () => {
        it('should archive completed appointments after X months', async () => {
            // Create old completed appointments (7 months ago)
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            const oldAppointments = [];
            for (let i = 0; i < 5; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-OLD-${i}`,
                        startTimeUtc: new Date(oldDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(oldDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED,
                        createdAt: oldDate,
                        updatedAt: oldDate
                    }
                });
                oldAppointments.push(appointment);
            }

            // Create recent appointments (should not be archived)
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() + 1);

            const recentAppointments = [];
            for (let i = 0; i < 3; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-RECENT-${i}`,
                        startTimeUtc: new Date(recentDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(recentDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
                recentAppointments.push(appointment);
            }

            // Verify initial state
            const initialCount = await prisma.appointment.count({ where: { tenantId } });
            expect(initialCount).toBe(8);

            // Archive appointments older than 6 months
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            expect(archiveResponse.status).toBe(200);
            const archiveResult = archiveResponse.body.data;

            expect(archiveResult.archivedCount).toBe(5);
            expect(archiveResult.totalProcessed).toBe(5);
            expect(archiveResult.errors).toHaveLength(0);
            expect(archiveResult.meetsRequirement).toBe(true);
            expect(archiveResult.isNonBlocking).toBe(true);

            // Verify archived appointments are moved
            const remainingCount = await prisma.appointment.count({ where: { tenantId } });
            expect(remainingCount).toBe(3); // Only recent appointments remain

            const archivedCount = await prisma.appointmentArchive.count({ where: { tenantId } });
            expect(archivedCount).toBe(5);

            // Verify recent appointments are still in main table
            for (const recentAppt of recentAppointments) {
                const exists = await prisma.appointment.findUnique({
                    where: { id: recentAppt.id }
                });
                expect(exists).toBeTruthy();
            }
        });

        it('should hide archived appointments from default view', async () => {
            // Create old appointment
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            const oldAppointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    serviceId,
                    staffId,
                    customerId,
                    referenceId: 'BK-HIDDEN-OLD',
                    startTimeUtc: oldDate,
                    endTimeUtc: new Date(oldDate.getTime() + 30 * 60 * 1000),
                    status: AppointmentStatus.COMPLETED,
                    createdAt: oldDate,
                    updatedAt: oldDate
                }
            });

            // Archive it
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            expect(archiveResponse.status).toBe(200);

            // Verify it's hidden from default appointment queries
            const appointmentResponse = await request(app)
                .get('/api/appointments')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(appointmentResponse.status).toBe(200);
            const appointments = appointmentResponse.body.data.items;

            // Should not contain the archived appointment
            const foundArchived = appointments.find((apt: any) => apt.referenceId === 'BK-HIDDEN-OLD');
            expect(foundArchived).toBeUndefined();

            // Verify it's in archive
            const archiveSearchResponse = await request(app)
                .get('/api/archive/search')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: 'BK-HIDDEN-OLD' });

            expect(archiveSearchResponse.status).toBe(200);
            const archivedAppointments = archiveSearchResponse.body.data.appointments;

            expect(archivedAppointments).toHaveLength(1);
            expect(archivedAppointments[0].referenceId).toBe('BK-HIDDEN-OLD');
        });

        it('should make archive searchable', async () => {
            // Create old appointments with different data
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            const appointments = [
                {
                    referenceId: 'BK-SEARCH-1',
                    customerName: 'Alice Smith',
                    serviceName: 'Consultation',
                    staffName: 'Dr. Smith'
                },
                {
                    referenceId: 'BK-SEARCH-2',
                    customerName: 'Bob Jones',
                    serviceName: 'Checkup',
                    staffName: 'Dr. Jones'
                },
                {
                    referenceId: 'BK-SEARCH-3',
                    customerName: 'Charlie Brown',
                    serviceName: 'Consultation',
                    staffName: 'Dr. Smith'
                }
            ];

            for (const apt of appointments) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: apt.referenceId,
                        startTimeUtc: new Date(oldDate.getTime() + Math.random() * 24 * 60 * 60 * 1000),
                        endTimeUtc: new Date(oldDate.getTime() + Math.random() * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED,
                        createdAt: oldDate,
                        updatedAt: oldDate
                    }
                });
            }

            // Archive them
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            expect(archiveResponse.status).toBe(200);
            expect(archiveResponse.body.data.archivedCount).toBe(3);

            // Search by reference ID
            const refSearchResponse = await request(app)
                .get('/api/archive/search')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: 'BK-SEARCH-2' });

            expect(refSearchResponse.status).toBe(200);
            expect(refSearchResponse.body.data.appointments).toHaveLength(1);
            expect(refSearchResponse.body.data.appointments[0].referenceId).toBe('BK-SEARCH-2');

            // Search by customer name (should work through reference ID search)
            const customerSearchResponse = await request(app)
                .get('/api/archive/search')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: 'BK-SEARCH' });

            expect(customerSearchResponse.status).toBe(200);
            expect(customerSearchResponse.body.data.appointments).toHaveLength(3);

            // Test pagination
            const paginatedResponse = await request(app)
                .get('/api/archive/search')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    search: 'BK-SEARCH',
                    page: 1,
                    limit: 2
                });

            expect(paginatedResponse.status).toBe(200);
            expect(paginatedResponse.body.data.appointments).toHaveLength(2);
            expect(paginatedResponse.body.data.total).toBe(3);
            expect(paginatedResponse.body.data.page).toBe(1);
            expect(paginatedResponse.body.data.limit).toBe(2);
        });
    });

    describe('ARCHIVAL - Non-Functional Tests', () => {
        it('should ensure archival job is non-blocking', async () => {
            // Create old appointments
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            for (let i = 0; i < 20; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-NONBLOCK-${i}`,
                        startTimeUtc: new Date(oldDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(oldDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED,
                        createdAt: oldDate,
                        updatedAt: oldDate
                    }
                });
            }

            // Start archival process
            const archiveStart = Date.now();
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            const archiveTime = Date.now() - archiveStart;

            // Should complete quickly (non-blocking)
            expect(archiveResponse.status).toBe(200);
            expect(archiveTime).toBeLessThan(5000); // Should be under 5 seconds
            expect(archiveResponse.body.data.meetsRequirement).toBe(true);
            expect(archiveResponse.body.meta.isNonBlocking).toBe(true);

            // Verify archival completed successfully
            expect(archiveResponse.body.data.archivedCount).toBe(20);
            expect(archiveResponse.body.data.errors).toHaveLength(0);
        });

        it('should ensure no data loss during archival', async () => {
            // Create old appointments with detailed data
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            const originalData = [];
            for (let i = 0; i < 10; i++) {
                const appointment = await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-NODATALOSS-${i}`,
                        startTimeUtc: new Date(oldDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(oldDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: i % 2 === 0 ? AppointmentStatus.COMPLETED : AppointmentStatus.CANCELLED,
                        notes: `Important notes for appointment ${i}`,
                        createdAt: oldDate,
                        updatedAt: oldDate
                    }
                });
                originalData.push(appointment);
            }

            // Archive appointments
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            expect(archiveResponse.status).toBe(200);
            expect(archiveResponse.body.data.errors).toHaveLength(0);

            // Verify data integrity by checking archived records
            for (const original of originalData) {
                const archived = await prisma.appointmentArchive.findFirst({
                    where: { referenceId: original.referenceId }
                });

                expect(archived).toBeTruthy();
                expect(archived?.tenantId).toBe(original.tenantId);
                expect(archived?.serviceId).toBe(original.serviceId);
                expect(archived?.staffId).toBe(original.staffId);
                expect(archived?.customerId).toBe(original.customerId);
                expect(archived?.referenceId).toBe(original.referenceId);
                expect(archived?.status).toBe(original.status);
                expect(archived?.notes).toBe(original.notes);
                expect(archived?.createdAt).toEqual(original.createdAt);
            }

            // Test restore functionality
            const firstArchived = await prisma.appointmentArchive.findFirst({
                where: { tenantId }
            });

            expect(firstArchived).toBeTruthy();

            const restoreResponse = await request(app)
                .post(`/api/archive/restore/${firstArchived!.id}`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(restoreResponse.status).toBe(200);
            expect(restoreResponse.body.data.success).toBe(true);
            expect(restoreResponse.body.data.appointmentId).toBe(firstArchived!.id);

            // Verify restored data matches original
            const restored = await prisma.appointment.findUnique({
                where: { id: firstArchived!.id }
            });

            expect(restored).toBeTruthy();
            expect(restored?.referenceId).toBe(firstArchived?.referenceId);
            expect(restored?.status).toBe(firstArchived?.status);
            expect(restored?.notes).toBe(firstArchived?.notes);

            // Verify archive record is deleted
            const archiveExists = await prisma.appointmentArchive.findUnique({
                where: { id: firstArchived!.id }
            });
            expect(archiveExists).toBeFalsy();
        });

        it('should handle archival performance requirements', async () => {
            // Test archival performance
            const perfResponse = await request(app)
                .post('/api/archive/test-performance')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ testMonths: 1 });

            expect(perfResponse.status).toBe(200);
            const perfResults = perfResponse.body.data;

            // Check performance requirements
            expect(perfResults.meetsRequirements.nonBlocking).toBe(true);
            expect(perfResults.meetsRequirements.noDataLoss).toBe(true);
            expect(perfResults.meetsRequirements.searchPerformance).toBe(true);

            // Check timing requirements
            const archiveTime = parseInt(perfResults.testResults.archiveTime);
            const searchTime = parseInt(perfResults.testResults.searchTime);
            const statsTime = parseInt(perfResults.testResults.statsTime);

            expect(archiveTime).toBeLessThan(5000); // Non-blocking
            expect(searchTime).toBeLessThan(500);   // Fast search
            expect(statsTime).toBeLessThan(2000);    // Stats generation
        });
    });

    describe('INTEGRATION TESTS', () => {
        it('should maintain data consistency between reporting and archival', async () => {
            // Create appointments across different time periods
            const oldDate = new Date();
            oldDate.setMonth(oldDate.getMonth() - 7);

            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() + 1);

            // Old appointments (will be archived)
            for (let i = 0; i < 5; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-INTEGRATION-OLD-${i}`,
                        startTimeUtc: new Date(oldDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(oldDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED,
                        createdAt: oldDate,
                        updatedAt: oldDate
                    }
                });
            }

            // Recent appointments (will remain)
            for (let i = 0; i < 3; i++) {
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId,
                        staffId,
                        customerId,
                        referenceId: `BK-INTEGRATION-RECENT-${i}`,
                        startTimeUtc: new Date(recentDate.getTime() + i * 60 * 60 * 1000),
                        endTimeUtc: new Date(recentDate.getTime() + (i + 1) * 60 * 60 * 1000),
                        status: AppointmentStatus.COMPLETED
                    }
                });
            }

            // Generate initial report
            const initialReportResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: oldDate.toISOString().split('T')[0],
                    to: recentDate.toISOString().split('T')[0]
                });

            expect(initialReportResponse.status).toBe(200);
            const initialSummary = initialReportResponse.body.data;
            expect(initialSummary.totalAppointments).toBe(8);
            expect(initialSummary.completedCount).toBe(8);

            // Archive old appointments
            const archiveResponse = await request(app)
                .post('/api/archive/archive')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ months: 6 });

            expect(archiveResponse.status).toBe(200);
            expect(archiveResponse.body.data.archivedCount).toBe(5);

            // Generate new report (should only show recent appointments)
            const newReportResponse = await request(app)
                .get('/api/reports/summary')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ 
                    from: recentDate.toISOString().split('T')[0],
                    to: new Date(recentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

            expect(newReportResponse.status).toBe(200);
            const newSummary = newReportResponse.body.data;
            expect(newSummary.totalAppointments).toBe(3);
            expect(newSummary.completedCount).toBe(3);

            // Verify archive statistics
            const statsResponse = await request(app)
                .get('/api/archive/stats')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(statsResponse.status).toBe(200);
            const stats = statsResponse.body.data;
            expect(stats.totalArchived).toBe(5);

            // Verify data consistency
            const totalOriginal = initialSummary.totalAppointments;
            const totalRemaining = newSummary.totalAppointments;
            const totalArchived = stats.totalArchived;

            expect(totalOriginal).toBe(totalRemaining + totalArchived);
        });
    });
});
