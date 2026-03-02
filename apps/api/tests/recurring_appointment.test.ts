import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Recurring Appointment Integration', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;

    beforeAll(async () => {
        await cleanupDatabase();
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Recurring Clinic',
                slug: `recurring-clinic-${Date.now()}`,
                timezone: 'UTC',
            }
        });
        tenantId = tenant.id;

        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Weekly Therapy',
                durationMinutes: 60,
            }
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Dr. Recurring',
                email: 'recurring@example.com',
            }
        });
        staffId = staff.id;
    });

    it('should create a weekly series of 4 appointments on correct 4 Mondays', async () => {
        // Find next Monday
        const startDate = new Date();
        startDate.setUTCHours(10, 0, 0, 0);
        while (startDate.getUTCDay() !== 1) {
            startDate.setUTCDate(startDate.getUTCDate() + 1);
        }

        const res = await request(app)
            .post('/api/public/bookings/recurring')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'Jane Recurring',
                    email: 'jane@example.com'
                },
                startTimeUtc: startDate.toISOString(),
                endTimeUtc: new Date(startDate.getTime() + 60 * 60 * 1000).toISOString(),
                recurring: {
                    frequency: 'WEEKLY',
                    occurrences: 4
                }
            });

        if (res.status !== 201) {
            console.error('Test Failed with body:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        expect(res.body.appointments).toHaveLength(4);

        const appointments = res.body.appointments;
        for (let i = 0; i < 4; i++) {
            const expectedDate = new Date(startDate);
            expectedDate.setUTCDate(startDate.getUTCDate() + (i * 7));
            expect(new Date(appointments[i].startTimeUtc).toISOString()).toBe(expectedDate.toISOString());
            expect(appointments[i].seriesIndex).toBe(i);
        }
    });

    it('should return conflict error if one slot in series is taken', async () => {
        const startDate = new Date();
        startDate.setUTCHours(14, 0, 0, 0);
        startDate.setUTCDate(startDate.getUTCDate() + 30); // Way in future

        // 1. Create a real customer and single appointment on the 3rd week's slot
        const conflictCustomer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'Conflict Customer',
                email: 'conflict@example.com'
            }
        });

        const thirdWeekDate = new Date(startDate);
        thirdWeekDate.setUTCDate(startDate.getUTCDate() + 14);

        await prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId: conflictCustomer.id,
                referenceId: `REF-${Date.now()}`,
                startTimeUtc: thirdWeekDate,
                endTimeUtc: new Date(thirdWeekDate.getTime() + 60 * 60 * 1000),
                status: 'BOOKED'
            }
        });

        // 2. Try to create series
        const res = await request(app)
            .post('/api/public/bookings/recurring')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: { name: 'Conflict User', email: 'conflict@example.com' },
                startTimeUtc: startDate.toISOString(),
                endTimeUtc: new Date(startDate.getTime() + 60 * 60 * 1000).toISOString(),
                recurring: { frequency: 'WEEKLY', occurrences: 4 }
            });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Slot collision in series');
        expect(res.body.conflictingDate).toBe(thirdWeekDate.toISOString());
    });

    it('should cancel only one occurrence with scope=single', async () => {
        // Create a small series
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + 100);

        const res = await request(app)
            .post('/api/public/bookings/recurring')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: { name: 'Cancel Single', email: 'single@example.com' },
                startTimeUtc: start.toISOString(),
                endTimeUtc: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
                recurring: { frequency: 'WEEKLY', occurrences: 3 }
            });

        const app2Id = res.body.appointments[1].id;

        const cancelRes = await request(app)
            .delete(`/api/appointments/${app2Id}?scope=single`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', 'test-admin')
            .set('x-user-role', 'ADMIN');

        expect(cancelRes.status).toBe(200);

        const app1 = await prisma.appointment.findUnique({ where: { id: res.body.appointments[0].id } });
        const app2 = await prisma.appointment.findUnique({ where: { id: app2Id } });
        const app3 = await prisma.appointment.findUnique({ where: { id: res.body.appointments[2].id } });

        expect(app1?.status).toBe('BOOKED');
        expect(app2?.status).toBe('CANCELLED');
        expect(app3?.status).toBe('BOOKED');
    });

    it('should cancel all future occurrences with scope=series', async () => {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + 200);

        const res = await request(app)
            .post('/api/public/bookings/recurring')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: { name: 'Cancel Series', email: 'series@example.com' },
                startTimeUtc: start.toISOString(),
                endTimeUtc: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
                recurring: { frequency: 'WEEKLY', occurrences: 5 }
            });

        const app3Id = res.body.appointments[2].id;

        const cancelRes = await request(app)
            .delete(`/api/appointments/${app3Id}?scope=series`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', 'test-admin')
            .set('x-user-role', 'ADMIN');

        expect(cancelRes.status).toBe(200);

        for (let i = 0; i < 5; i++) {
            const app = await prisma.appointment.findUnique({ where: { id: res.body.appointments[i].id } });
            if (i < 2) expect(app?.status).toBe('BOOKED');
            else expect(app?.status).toBe('CANCELLED');
        }
    });

    it('should reschedule all future occurrences with scope=series', async () => {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + 300);
        start.setUTCHours(10, 0, 0, 0);

        const res = await request(app)
            .post('/api/public/bookings/recurring')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: { name: 'Resched Series', email: 'resched@example.com' },
                startTimeUtc: start.toISOString(),
                endTimeUtc: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
                recurring: { frequency: 'WEEKLY', occurrences: 3 }
            });

        const app1Id = res.body.appointments[0].id;
        const newStart = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

        const reschedRes = await request(app)
            .patch(`/api/appointments/${app1Id}/reschedule?scope=series`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', 'test-admin')
            .set('x-user-role', 'ADMIN')
            .send({
                startTimeUtc: newStart.toISOString(),
                endTimeUtc: newEnd.toISOString()
            });

        expect(reschedRes.status).toBe(200);

        for (let i = 0; i < 3; i++) {
            const app = await prisma.appointment.findUnique({ where: { id: res.body.appointments[i].id } });
            const expectedStart = new Date(start.getTime() + (i * 7 * 24 * 60 * 60 * 1000) + 2 * 60 * 60 * 1000);
            expect(app?.startTimeUtc.toISOString()).toBe(expectedStart.toISOString());
        }
    });
});
