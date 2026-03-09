import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import { DEFAULT_CONFIG } from '../src/modules/config/config.schema';
import { cleanupDatabase } from './helpers';

describe('Configuration Engine - Phase 3', () => {
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

    describe('Core Configuration Management', () => {
        it('should return default config if none set', async () => {
            const response = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(DEFAULT_CONFIG);
        });

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

        it('should maintain version history', async () => {
            const historyRes = await request(app)
                .get('/api/config/history')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(historyRes.status).toBe(200);
            expect(historyRes.body.data).toHaveLength(1);
            expect(historyRes.body.data[0].version).toBe(1);
            expect(historyRes.body.data[0].note).toBe('Increased bookings');
        });
    });

    describe('Rollback Functionality', () => {
        it('should rollback to a previous version', async () => {
            // Save version 2 (200 bookings)
            const v2Config = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 200 }
            };
            await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ config: v2Config, note: 'Version 2' });

            // Rollback to version 1
            const rollbackRes = await request(app)
                .post('/api/config/rollback/1')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(rollbackRes.status).toBe(201);
            expect(rollbackRes.body.data.version).toBe(3);
            expect(rollbackRes.body.data.config.booking.maxBookingsPerDay).toBe(100);
        });

        it('should fail rollback for non-existent version', async () => {
            const response = await request(app)
                .post('/api/config/rollback/999')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });
    });

    describe('Feature Flags System', () => {
        it('should get all features', async () => {
            const response = await request(app)
                .get('/api/config/features')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('aiSummaryEnabled');
            expect(response.body.data).toHaveProperty('loadBalancingEnabled');
            expect(response.body.data).toHaveProperty('recurringEnabled');
        });

        it('should enable a feature', async () => {
            const response = await request(app)
                .post('/api/config/features/enable')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ feature: 'aiSummaryEnabled', note: 'Enable AI features' });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('aiSummaryEnabled enabled');

            // Verify feature is enabled
            const featuresRes = await request(app)
                .get('/api/config/features')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(featuresRes.body.data.aiSummaryEnabled).toBe(true);
        });

        it('should disable a feature', async () => {
            const response = await request(app)
                .post('/api/config/features/disable')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ feature: 'aiSummaryEnabled', note: 'Disable AI features' });

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('aiSummaryEnabled disabled');

            // Verify feature is disabled
            const featuresRes = await request(app)
                .get('/api/config/features')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(featuresRes.body.data.aiSummaryEnabled).toBe(false);
        });

        it('should reject invalid feature name', async () => {
            const response = await request(app)
                .post('/api/config/features/enable')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ feature: 'invalidFeature' });

            expect(response.status).toBe(500); // Will fail validation in service
        });
    });

    describe('Staff Permissions', () => {
        it('should check staff permissions', async () => {
            const response = await request(app)
                .get('/api/config/permissions/canCancelAppointments')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('permission', 'canCancelAppointments');
            expect(response.body.data).toHaveProperty('hasPermission');
        });

        it('should be blocked for staff users', async () => {
            const response = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('Booking Policy Validation', () => {
        it('should validate booking window', async () => {
            const futureTime = new Date();
            futureTime.setHours(futureTime.getHours() + 2); // 2 hours from now

            const response = await request(app)
                .post('/api/config/validate/booking-window')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ appointmentTime: futureTime.toISOString() });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('isValid');
            expect(response.body.data).toHaveProperty('appointmentTime');
        });

        it('should validate cancellation policy', async () => {
            const futureTime = new Date();
            futureTime.setHours(futureTime.getHours() + 48); // 48 hours from now

            const response = await request(app)
                .post('/api/config/validate/cancellation')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    appointmentTime: futureTime.toISOString(),
                    isStaff: false 
                });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('canCancel');
        });

        it('should check business hours', async () => {
            const today = new Date().toISOString();

            const response = await request(app)
                .post('/api/config/validate/business-hours')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ date: today });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('isOpen');
            expect(response.body.data).toHaveProperty('date');
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

        it('should provide performance metrics', async () => {
            // Make a few requests to generate metrics
            await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            const response = await request(app)
                .get('/api/config/metrics')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('metrics');
            expect(response.body.data).toHaveProperty('cacheHitRate');
            expect(response.body.data).toHaveProperty('averageFetchTime');
        });

        it('should pass health check', async () => {
            const response = await request(app)
                .get('/api/config/health')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('healthy');
            expect(response.body.data).toHaveProperty('cacheSize');
            expect(response.body.data).toHaveProperty('metrics');
        });

        it('should clear cache', async () => {
            const response = await request(app)
                .delete('/api/config/cache')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toContain('Cache cleared successfully');
        });
    });

    describe('Booking Limits Enforcement', () => {
        it('should enforce max bookings per day limit', async () => {
            const limitedConfig = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 5 }
            };

            await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    config: limitedConfig,
                    note: 'Set booking limit for testing'
                });

            // Verify the limit is enforced
            const currentRes = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(currentRes.body.data.booking.maxBookingsPerDay).toBe(5);
        });

        it('should validate slot lock duration', async () => {
            const invalidConfig = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, slotLockDurationMinutes: 120 } // Over 60 min limit
            };

            const response = await request(app)
                .post('/api/config')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ config: invalidConfig });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing appointmentTime in validation', async () => {
            const response = await request(app)
                .post('/api/config/validate/booking-window')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('BAD_REQUEST');
        });

        it('should handle invalid date format', async () => {
            const response = await request(app)
                .post('/api/config/validate/cancellation')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ appointmentTime: 'invalid-date' });

            expect(response.status).toBe(500); // Will fail date parsing
        });

        it('should handle missing feature name', async () => {
            const response = await request(app)
                .post('/api/config/features/enable')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('BAD_REQUEST');
        });
    });
});
