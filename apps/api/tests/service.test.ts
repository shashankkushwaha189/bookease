import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { cleanupDatabase } from './helpers';

describe('Services Module', () => {
    let tenantA: any;
    let tenantB: any;
    let adminTokenA: string;
    let serviceId: string;
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

    describe('POST /api/services', () => {
        it('should create a service with valid data', async () => {
            const response = await request(app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    name: 'Checkup',
                    durationMinutes: 30,
                    bufferBefore: 5,
                    bufferAfter: 5,
                    price: 50
                });

            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe('Checkup');
            serviceId = response.body.data.id;
        });

        it('should reject negative duration', async () => {
            const response = await request(app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    name: 'Invalid Service',
                    durationMinutes: -10
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject duplicate names in same tenant', async () => {
            const response = await request(app)
                .post('/api/services')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`)
                .send({
                    name: 'Checkup',
                    durationMinutes: 45
                });

            expect(response.status).toBe(409);
        });
    });

    describe('GET /api/public/services', () => {
        it('should list only active services for the tenant', async () => {
            // Create another service and make it inactive
            await prisma.service.create({
                data: {
                    name: 'Hidden Service',
                    durationMinutes: 60,
                    tenantId: tenantA.id,
                    isActive: false
                }
            });

            const response = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantA.id);

            expect(response.status).toBe(200);
            const services = response.body.data;
            expect(services.some((s: any) => s.name === 'Checkup')).toBe(true);
            expect(services.some((s: any) => s.name === 'Hidden Service')).toBe(false);
        });

        it('should respect tenant isolation', async () => {
            // Tenant B should see 0 services
            const response = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantB.id);

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(0);
        });
    });

    describe('DELETE /api/services/:id', () => {
        it('should soft delete the service', async () => {
            const response = await request(app)
                .delete(`/api/services/${serviceId}`)
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${adminTokenA}`);

            expect(response.status).toBe(200);

            // Verify it's inactive in public list
            const publicRes = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantA.id);

            expect(publicRes.body.data.some((s: any) => s.id === serviceId)).toBe(false);

            // Verify it's still in DB but inactive
            const dbService = await prisma.service.findUnique({ where: { id: serviceId } });
            expect(dbService?.isActive).toBe(false);
        });
    });
});
