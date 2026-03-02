import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';
import { AppointmentStatus, UserRole, TimelineEvent } from '../src/generated/client';

describe('Policy Engine Integration', () => {
    let tenantId: string;
    let serviceId: string;
    let staffId: string;
    let customerId: string;
    let adminId: string;
    let staffUserId: string;

    beforeAll(async () => {
        await cleanupDatabase();
        // Setup shared data
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Policy Test Clinic',
                slug: `policy-test-${Date.now()}`,
                timezone: 'UTC'
            }
        });
        tenantId = tenant.id;

        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Policy Test Service',
                durationMinutes: 30
            }
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Policy Staff'
            }
        });
        staffId = staff.id;

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'Policy Customer',
                email: 'policy@example.com'
            }
        });
        customerId = customer.id;

        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: 'admin@policy.com',
                passwordHash: 'hash',
                role: UserRole.ADMIN
            }
        });
        adminId = admin.id;

        const staffUser = await prisma.user.create({
            data: {
                tenantId,
                email: 'staff@policy.com',
                passwordHash: 'hash',
                role: UserRole.STAFF
            }
        });
        staffUserId = staffUser.id;

        // Ensure default config exists
        await prisma.tenantConfig.create({
            data: {
                tenantId,
                version: 1,
                config: {
                    booking: { maxBookingsPerDay: 50, slotLockDurationMinutes: 25, allowGuestBooking: true },
                    cancellation: { allowedUntilHoursBefore: 24, maxReschedules: 1, noShowGracePeriodMinutes: 15 },
                    features: { aiSummaryEnabled: false, loadBalancingEnabled: false, recurringEnabled: true },
                    staff: { canCancelAppointments: true, canRescheduleAppointments: true }
                },
                createdBy: adminId,
                isActive: true
            }
        });
    });

    it('should reject staff cancellation within 24h window', async () => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 2); // 2 hours from now

        const appointment = await prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-1`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: AppointmentStatus.BOOKED
            }
        });

        const res = await request(app)
            .post(`/api/appointments/${appointment.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', staffUserId)
            .set('x-user-role', UserRole.STAFF);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Cancellation window has closed');
    });

    it('should allow admin override for cancellation within window', async () => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 2);

        const appointment = await prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-2`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: AppointmentStatus.BOOKED
            }
        });

        const res = await request(app)
            .post(`/api/appointments/${appointment.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .set('x-user-role', UserRole.ADMIN)
            .send({ overrideReason: 'Emergency staff shortage override' });

        expect(res.status).toBe(200);

        const timeline = await prisma.appointmentTimeline.findFirst({
            where: { appointmentId: appointment.id, note: { contains: '[OVERRIDE]' } }
        });
        expect(timeline).toBeDefined();
        expect(timeline?.note).toContain('Emergency staff shortage override');
    });

    it('should reject reschedule if limit reached (maxReschedules: 1)', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 2); // Far in future to avoid cancellation window window check for staff

        const appointment = await prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-3`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: AppointmentStatus.BOOKED
            }
        });

        // Add 1 reschedule to match limit
        await prisma.appointmentTimeline.create({
            data: {
                appointmentId: appointment.id,
                tenantId,
                eventType: TimelineEvent.RESCHEDULED,
                note: '[RESCHEDULE] Previous shift',
                performedBy: staffUserId
            }
        });

        const res = await request(app)
            .post(`/api/appointments/${appointment.id}/reschedule`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', staffUserId)
            .set('x-user-role', UserRole.STAFF)
            .send({
                startTimeUtc: new Date(startTime.getTime() + 3600000).toISOString(),
                endTimeUtc: new Date(startTime.getTime() + 3600000 + 1800000).toISOString()
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Reschedule limit reached');
    });

    it('should mark past confirmed appointments as NO_SHOW via background job', async () => {
        const pastTime = new Date();
        pastTime.setMinutes(pastTime.getMinutes() - 30); // 30 mins ago (grace is 15)

        const appointment = await prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-4`,
                startTimeUtc: pastTime,
                endTimeUtc: new Date(pastTime.getTime() + 30 * 60000),
                status: AppointmentStatus.CONFIRMED
            }
        });

        // Trigger job logic
        const { AppointmentService } = await import('../src/modules/appointment/appointment.service');
        const service = new AppointmentService();
        await service.markNoShows();

        const updated = await prisma.appointment.findUnique({ where: { id: appointment.id } });
        expect(updated?.status).toBe(AppointmentStatus.NO_SHOW);
    });
});
