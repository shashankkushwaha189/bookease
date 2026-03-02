import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Appointment Engine Integration', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;

    beforeAll(async () => {
        await cleanupDatabase();
        // Setup seed data
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Clinic',
                slug: `test-clinic-${Date.now()}`,
                timezone: 'UTC',
            }
        });
        tenantId = tenant.id;

        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Consultation',
                durationMinutes: 30,
            }
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Dr. Smith',
                email: 'smith@example.com',
            }
        });
        staffId = staff.id;
    });

    it('should create a slot lock and then book an appointment', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 24, 0, 0, 0); // Tomorrow at 00:00
        const endTimeUtc = new Date(startTimeUtc);
        endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

        // 1. Create Lock
        const lockRes = await request(app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
                staffId,
                startTimeUtc: startTimeUtc.toISOString(),
                endTimeUtc: endTimeUtc.toISOString(),
                sessionToken: 'test-session-123'
            });

        expect(lockRes.status).toBe(201);
        const lock = lockRes.body;

        // 2. Create Booking using the lock
        const bookingRes = await request(app)
            .post('/api/public/bookings/book')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '1234567890'
                },
                startTimeUtc: startTimeUtc.toISOString(),
                endTimeUtc: endTimeUtc.toISOString(),
                sessionToken: 'test-session-123',
                consentGiven: true
            });

        expect(bookingRes.status).toBe(201);
        expect(bookingRes.body).toBeDefined();
        expect(bookingRes.body.referenceId).toMatch(/^BK-\d{4}-\d{5}$/);
    });

    it('should reject a second lock on the same slot', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 48, 0, 0, 0);
        const endTimeUtc = new Date(startTimeUtc);
        endTimeUtc.setMinutes(endTimeUtc.getMinutes() + 30);

        await request(app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
                staffId,
                startTimeUtc: startTimeUtc.toISOString(),
                endTimeUtc: endTimeUtc.toISOString(),
                sessionToken: 'token-1'
            });

        const lockRes2 = await request(app)
            .post('/api/public/bookings/locks')
            .set('x-tenant-id', tenantId)
            .send({
                staffId,
                startTimeUtc: startTimeUtc.toISOString(),
                endTimeUtc: endTimeUtc.toISOString(),
                sessionToken: 'token-2'
            });
        console.log('DEBUG: Second lock status:', lockRes2.status);
        console.log('DEBUG: Second lock body:', JSON.stringify(lockRes2.body));
        expect(lockRes2.status).toBe(409);
    });
});
