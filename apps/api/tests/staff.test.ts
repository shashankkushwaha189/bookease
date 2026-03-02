import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './helpers';

describe('Staff Module', () => {
    let tenantA: any;
    let tenantB: any;
    let adminTokenA: string;
    let serviceIdA: string;
    let serviceIdB: string;
    let staffId: string;
    const password = 'Password@123';

    beforeAll(async () => {
        await cleanupDatabase();

        tenantA = await prisma.tenant.create({
            data: { name: 'Tenant A', slug: 'tenant-a' },
        });

        tenantB = await prisma.tenant.create({
            data: { name: 'Tenant B', slug: 'tenant-b' },
        });

        const passwordHash = await bcrypt.hash(password, 12);

        await prisma.user.create({
            data: {
                email: 'admin@tenant-a.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenantA.id,
            },
        });

        // Create services
        const serviceA = await prisma.service.create({
            data: { name: 'Service A', durationMinutes: 30, tenantId: tenantA.id }
        });
        serviceIdA = serviceA.id;

        const serviceB = await prisma.service.create({
            data: { name: 'Service B', durationMinutes: 60, tenantId: tenantB.id }
        });
        serviceIdB = serviceB.id;

        // Login to get token
        const login = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantA.id)
            .send({ email: 'admin@tenant-a.com', password });
        adminTokenA = login.body.data.token;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('POST /api/staff', () => {
        it('should create a staff member', async () => {
            const response = await request(app)
                .post('/api/staff')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    bio: 'Senior Stylist'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe('John Doe');
            staffId = response.body.data.id;
        });
    });

    describe('POST /api/staff/:id/services', () => {
        it('should assign services to staff', async () => {
            const response = await request(app)
                .post(`/api/staff/${staffId}/services`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    serviceIds: [serviceIdA]
                });

            expect(response.status).toBe(200);
            expect(response.body.data.staffServices.length).toBe(1);
        });

        it('should reject services from another tenant', async () => {
            const response = await request(app)
                .post(`/api/staff/${staffId}/services`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    serviceIds: [serviceIdB]
                });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('One or more services do not belong to this tenant');
        });
    });

    describe('PUT /api/staff/:id/schedule', () => {
        it('should set weekly working hours with valid breaks', async () => {
            const response = await request(app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    schedules: [
                        {
                            dayOfWeek: 1,
                            startTime: '09:00',
                            endTime: '17:00',
                            isWorking: true,
                            breaks: [
                                { startTime: '12:00', endTime: '13:00' }
                            ]
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.data.weeklySchedule.length).toBe(1);
        });

        it('should reject break outside working hours', async () => {
            const response = await request(app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    schedules: [
                        {
                            dayOfWeek: 1,
                            startTime: '09:00',
                            endTime: '17:00',
                            isWorking: true,
                            breaks: [
                                { startTime: '08:00', endTime: '10:00' }
                            ]
                        }
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('must be within working hours');
        });

        it('should reject overlapping breaks', async () => {
            const response = await request(app)
                .put(`/api/staff/${staffId}/schedule`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    schedules: [
                        {
                            dayOfWeek: 1,
                            startTime: '09:00',
                            endTime: '17:00',
                            isWorking: true,
                            breaks: [
                                { startTime: '12:00', endTime: '13:00' },
                                { startTime: '12:30', endTime: '13:30' }
                            ]
                        }
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('Breaks cannot overlap');
        });
    });

    describe('POST /api/staff/:id/time-off', () => {
        it('should block off dates', async () => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            const response = await request(app)
                .post(`/api/staff/${staffId}/time-off`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    date: date.toISOString(),
                    reason: 'Holiday'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.timeOffs.length).toBe(1);
        });
    });

    describe('GET /api/public/staff', () => {
        it('should list limited staff info publicly', async () => {
            const response = await request(app)
                .get('/api/public/staff')
                .set('X-Tenant-ID', tenantA.id);

            expect(response.status).toBe(200);
            expect(response.body.data[0]).toHaveProperty('name');
            expect(response.body.data[0]).toHaveProperty('photoUrl');
            expect(response.body.data[0]).toHaveProperty('services');
            expect(response.body.data[0]).not.toHaveProperty('email');
            expect(response.body.data[0]).not.toHaveProperty('weeklySchedule');
        });
    });
});
