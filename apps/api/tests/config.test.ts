import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { DEFAULT_CONFIG } from '../src/modules/config/config.schema';
import { cleanupDatabase } from './helpers';

describe('Configuration Engine', () => {
    let tenantId: string;
    let adminToken: string;
    let staffToken: string;
    const password = 'Password@123';

    beforeAll(async () => {
        await cleanupDatabase();

        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: 'test-tenant',
            },
        });
        tenantId = tenant.id;

        const passwordHash = await bcrypt.hash(password, 12);

        const adminUser = await prisma.user.create({
            data: {
                email: 'admin@test.com',
                passwordHash,
                role: 'ADMIN',
                tenantId,
            },
        });

        const staffUser = await prisma.user.create({
            data: {
                email: 'staff@test.com',
                passwordHash,
                role: 'STAFF',
                tenantId,
            },
        });

        // Login to get tokens
        const adminLogin = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'admin@test.com', password });
        adminToken = adminLogin.body.data.token;

        const staffLogin = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'staff@test.com', password });
        staffToken = staffLogin.body.data.token;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('GET /api/config/current', () => {
        it('should return default config if none set', async () => {
            const response = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(DEFAULT_CONFIG);
        });

        it('should be blocked for staff users', async () => {
            const response = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/config', () => {
        it('should save new config and increment version', async () => {
            const newConfig = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 100 }
            };

            const response = await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    config: newConfig,
                    note: 'Increased bookings'
                });

            expect(response.status).toBe(201);
            expect(response.body.data.version).toBe(1);
            expect(response.body.data.config.booking.maxBookingsPerDay).toBe(100);

            // Fetch current to verify
            const currentRes = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(currentRes.body.data.booking.maxBookingsPerDay).toBe(100);
        });

        it('should reject invalid config shape', async () => {
            const response = await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    config: { booking: { maxBookingsPerDay: -1 } } // Invalid
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('Rollback', () => {
        it('should rollback to a previous version', async () => {
            // 1. Current is version 1 (100 bookings)
            // 2. Save version 2 (200 bookings)
            const v2Config = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 200 }
            };
            await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ config: v2Config });

            // 3. Rollback to version 1
            const rollbackRes = await request(app)
                .post('/api/config/rollback/1')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(rollbackRes.status).toBe(201);
            expect(rollbackRes.body.data.version).toBe(3);
            expect(rollbackRes.body.data.config.booking.maxBookingsPerDay).toBe(100);
        });
    });

    describe('Performance & Caching', () => {
        it('should return under 50ms on cache hit', async () => {
            // First hit to prime cache
            await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            const start = Date.now();
            await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(50);
        });
    });
});
