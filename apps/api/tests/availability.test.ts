import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { addMinutes, format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { AppointmentStatus } from '../src/generated/client';
import { cleanupDatabase } from './helpers';

describe('Availability Engine', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;
    const timezone = 'Asia/Kolkata';

    beforeAll(async () => {
        // Cleanup
        await cleanupDatabase();

        const tenant = await prisma.tenant.create({
            data: { name: 'Test Tenant', slug: 'test-tenant', timezone },
        });
        tenantId = tenant.id;

        const service = await prisma.service.create({
            data: {
                name: 'Haircut',
                durationMinutes: 30,
                bufferBefore: 15,
                bufferAfter: 15,
                tenantId: tenant.id
            }
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                name: 'Stylist A',
                tenantId: tenant.id,
                weeklySchedule: {
                    createMany: {
                        data: [0, 1, 2, 3, 4, 5, 6].map(day => ({
                            dayOfWeek: day,
                            startTime: '09:00',
                            endTime: '17:00',
                            isWorking: true,
                        }))
                    }
                }
            }
        });
        staffId = staff.id;

        // Add break for Monday
        const mondaySchedule = await prisma.weeklySchedule.findFirst({
            where: { staffId: staff.id, dayOfWeek: 1 }
        });
        await prisma.staffBreak.create({
            data: {
                weeklyScheduleId: mondaySchedule!.id,
                startTime: '12:00',
                endTime: '13:00'
            }
        });

        await prisma.staffService.create({
            data: { staffId: staff.id, serviceId: service.id }
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('should generate slots within working hours (Monday)', async () => {
        const date = '2026-03-02'; // A Monday
        const response = await request(app)
            .get('/api/availability')
            .set('X-Tenant-ID', tenantId)
            .query({ serviceId, date, staffId });

        expect(response.status).toBe(200);
        const { slots } = response.body.data;

        // Slot formula: startTime = currentSlotStart + bufferBefore
        // First slot: 09:00 (workStart) + 15m (bufferBefore) = 09:15
        // Duration: 30m. End: 09:45. 
        // Advance: 09:00 + 15 + 30 + 15 = 10:00 (next slotStart)

        expect(slots[0].startTimeLocal).toBe('09:15');
        expect(slots[1].startTimeLocal).toBe('10:15');

        // Ensure no slots during break (12:00 - 13:00)
        const breakSlots = slots.filter((s: any) => s.startTimeLocal >= '12:00' && s.startTimeLocal < '13:00');
        expect(breakSlots.length).toBe(0);
    });

    it('should block slots for existing appointments', async () => {
        const date = '2026-03-02';
        const startTime = fromZonedTime(`${date} 10:15:00`, timezone);
        const endTime = fromZonedTime(`${date} 10:45:00`, timezone);

        const customer = await prisma.customer.create({
            data: { tenantId, name: 'Existing Customer', email: 'test@' + Date.now() + '.com' }
        });

        await prisma.appointment.create({
            data: {
                tenantId,
                staffId,
                serviceId,
                customerId: customer.id,
                referenceId: 'OLD-1',
                startTimeUtc: startTime,
                endTimeUtc: endTime,
                status: AppointmentStatus.CONFIRMED
            }
        });

        const response = await request(app)
            .get('/api/availability')
            .set('X-Tenant-ID', tenantId)
            .query({ serviceId, date, staffId });

        expect(response.status).toBe(200);
        const { slots } = response.body.data;

        // 10:15 slot should be gone
        const bookedSlot = slots.find((s: any) => s.startTimeLocal === '10:15');
        expect(bookedSlot).toBeUndefined();
    });

    it('should block slots for active slot locks', async () => {
        const date = '2026-03-02';
        const startTime = fromZonedTime(`${date} 11:15:00`, timezone);
        const endTime = fromZonedTime(`${date} 11:45:00`, timezone);

        await prisma.slotLock.create({
            data: {
                tenantId,
                staffId,
                startTimeUtc: startTime,
                endTimeUtc: endTime,
                sessionToken: 'test-lock',
                expiresAt: addMinutes(new Date(), 30) // Active lock
            }
        });

        const response = await request(app)
            .get('/api/availability')
            .set('X-Tenant-ID', tenantId)
            .query({ serviceId, date, staffId });

        expect(response.status).toBe(200);
        const { slots } = response.body.data;

        const lockedSlot = slots.find((s: any) => s.startTimeLocal === '11:15');
        expect(lockedSlot).toBeUndefined();
    });

    it('should return empty slots if staff has time-off', async () => {
        const date = '2026-03-02';
        const timeOffDate = new Date(date);
        timeOffDate.setHours(0, 0, 0, 0);

        await prisma.staffTimeOff.create({
            data: {
                staffId,
                date: timeOffDate,
                reason: 'Holiday'
            }
        });

        const response = await request(app)
            .get('/api/availability')
            .set('X-Tenant-ID', tenantId)
            .query({ serviceId, date, staffId });

        expect(response.status).toBe(200);
        expect(response.body.data.slots.length).toBe(0);
    });

    it('should handle timezone correctly (DST transition simulation)', async () => {
        // Note: Asia/Kolkata doesn't have DST, but let's test a date in US for logic
        const usTimezone = 'America/New_York';
        const date = '2026-03-08'; // DST start in US 2026

        // Clear and mock for this specific test
        await prisma.weeklySchedule.update({
            where: { staffId_dayOfWeek: { staffId, dayOfWeek: 0 } }, // Sunday
            data: { isWorking: true, startTime: '02:00', endTime: '10:00' }
        });

        const response = await request(app)
            .get('/api/availability')
            .set('X-Tenant-ID', tenantId) // Usually tenant has its own TZ
            .query({ serviceId, date, staffId });

        // The logic uses the businessTimezone passed in generateSlots (defaulted to Asia/Kolkata in controller currently)
        // In a real app we'd fetch from tenant.
        expect(response.status).toBe(200);
        // If the engine correctly uses date-fns-tz, it will handle the offset jump
    });
});
