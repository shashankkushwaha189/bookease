import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';
import { AppointmentStatus, TimelineEvent, UserRole } from '../src/generated/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import fs from 'fs';
import { auditService } from '../src/modules/audit/audit.service';

describe('Audit & Timeline Integration', () => {
    let tenantId: string;
    let adminToken: string;
    let adminId: string;
    let serviceId: string;
    let staffId: string;
    let customerId: string;

    beforeAll(async () => {
        await cleanupDatabase();

        // 1. Create Tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Audit Test Tenant',
                slug: 'audit-test',
            },
        });
        tenantId = tenant.id;

        // 2. Create Admin User
        const admin = await prisma.user.create({
            data: {
                tenantId,
                email: 'admin@audit.test',
                passwordHash: 'hash',
                role: UserRole.ADMIN,
            },
        });
        adminId = admin.id;

        adminToken = jwt.sign(
            { sub: admin.id, tenantId, role: admin.role },
            env.JWT_SECRET
        );

        // 3. Setup Service & Staff
        const service = await prisma.service.create({
            data: {
                tenantId,
                name: 'Test Audit Service',
                durationMinutes: 30,
            },
        });
        serviceId = service.id;

        const staff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Audit Staff',
            },
        });
        staffId = staff.id;

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'Test Customer',
                email: 'test@example.com',
            }
        });
        customerId = customer.id;
    });

    it('should create a timeline event when an appointment is booked', async () => {
        const startTimeUtc = new Date();
        startTimeUtc.setHours(startTimeUtc.getHours() + 24);
        const endTimeUtc = new Date(startTimeUtc.getTime() + 30 * 60 * 1000);

        const res = await request(app)
            .post('/api/public/bookings/book')
            .set('x-tenant-id', tenantId)
            .send({
                serviceId,
                staffId,
                customer: {
                    name: 'Auditor',
                    email: 'auditor@example.com',
                },
                startTimeUtc: startTimeUtc.toISOString(),
                endTimeUtc: endTimeUtc.toISOString(),
                sessionToken: 'audit-session-123',
                consentGiven: true
            });

        if (res.status !== 201) {
            console.error('TEST FAILURE BODY:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(201);
        const appointmentId = res.body.id || res.body.appointment?.id;
        console.log("TEST 1 APPOINTMENT ID is:", appointmentId, "Body was:", res.body);

        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));

        // Verify Timeline
        const timelineRes = await request(app)
            .get(`/api/appointments/${appointmentId}/timeline`)
            .set('x-tenant-id', tenantId);

        expect(timelineRes.status).toBe(200);
        expect(timelineRes.body).toHaveLength(1);
        expect(timelineRes.body[0].eventType).toBe(TimelineEvent.CREATED);
        expect(timelineRes.body[0].performedBy).toBe('PUBLIC');

        // Verify Audit Log
        const auditRes = await request(app)
            .get('/api/audit')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(auditRes.status).toBe(200);
        const log = auditRes.body.items.find((l: any) => l.action === 'appointment.create');
        expect(log).toBeDefined();
        expect(log.resourceId).toBe(appointmentId);
    });

    it('should create a timeline event and audit log on status change', async () => {
        // 1. Create appointment directly to speed up
        const appt = await prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId: (await prisma.customer.findFirst({ where: { tenantId } }))!.id,
                referenceId: 'AUDIT-001',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(),
                status: AppointmentStatus.BOOKED,
            }
        });

        // 2. Update status
        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/status`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .send({
                status: AppointmentStatus.CONFIRMED,
                notes: 'Confirming for audit test'
            });

        if (res.status !== 200) {
            console.error('TEST FAILURE BODY (Status Update):', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(200);

        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));

        // 3. Check Timeline
        const timelineRes = await request(app)
            .get(`/api/appointments/${appt.id}/timeline`)
            .set('x-tenant-id', tenantId);

        const confirmedEvent = timelineRes.body.find((e: any) => e.eventType === TimelineEvent.CONFIRMED);
        expect(confirmedEvent).toBeDefined();
        expect(confirmedEvent.performedBy).toBe(adminId);
        expect(confirmedEvent.note).toBe('Confirming for audit test');

        // 4. Check Audit
        const auditRes = await request(app)
            .get('/api/audit?action=appointment.status.confirmed')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(auditRes.body.items).toHaveLength(1);
        expect(auditRes.body.items[0].resourceId).toBe(appt.id);
        expect(auditRes.body.items[0].before.status).toBe(AppointmentStatus.BOOKED);
        expect(auditRes.body.items[0].after.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('should create ADMIN_OVERRIDE event when cancelling with override', async () => {
        const appt = await prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId: (await prisma.customer.findFirst({ where: { tenantId } }))!.id,
                referenceId: 'AUDIT-OVERRIDE-001',
                startTimeUtc: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future (inside window)
                endTimeUtc: new Date(Date.now() + 40 * 60 * 1000),
                status: AppointmentStatus.BOOKED,
            }
        });

        const res = await request(app)
            .post(`/api/appointments/${appt.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .set('x-user-role', UserRole.ADMIN)
            .send({
                overrideReason: 'Testing audit override event logging'
            });

        if (res.status !== 200) {
            console.error('CANCEL OVERRIDE FLR:', JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(200);

        // Wait for background logging to settle
        await new Promise(r => setTimeout(r, 100));

        const timelineRes = await request(app)
            .get(`/api/appointments/${appt.id}/timeline`)
            .set('x-tenant-id', tenantId);

        const overrideEvent = timelineRes.body.find((e: any) => e.eventType === TimelineEvent.ADMIN_OVERRIDE);
        if (!overrideEvent) {
            console.error('TIMELINE BODY FOR OVERRIDE:', JSON.stringify(timelineRes.body, null, 2));
        }
        expect(overrideEvent).toBeDefined();
        expect(overrideEvent.note).toContain('Testing audit override');
    });

    it('should not allow deleting timeline events via API (regression check)', async () => {
        // Since we didn't add DELETE route, this should 404 naturally
        const res = await request(app)
            .delete(`/api/appointments/some-id/timeline`)
            .set('x-tenant-id', tenantId);

        expect(res.status).toBe(404);
    });

    it('should not fail the main request if audit logging fails (resilience)', async () => {
        // Mock auditService.logEvent to throw
        const spy = vi.spyOn(auditService, 'logEvent')
            .mockRejectedValue(new Error('Audit DB Down'));

        const appt = await prisma.appointment.create({
            data: {
                tenantId,
                serviceId,
                staffId,
                customerId,
                referenceId: 'AUDIT-FAIL-001',
                startTimeUtc: new Date(),
                endTimeUtc: new Date(),
                status: AppointmentStatus.BOOKED,
            }
        });

        const res = await request(app)
            .patch(`/api/appointments/${appt.id}/status`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .send({
                status: AppointmentStatus.CONFIRMED
            });

        // Request should still succeed
        expect(res.status).toBe(200);

        // Restore mock
        spy.mockRestore();
    });
});
