import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import express from 'express';
import { cleanupDatabase } from './helpers';
import { UserRole } from '../src/generated/client';
import { apiKeyMiddleware, apiKeyRateLimiter } from '../src/middleware/api-key.middleware';

describe('API Tokens Module', () => {
    let tenant: any;
    let adminToken: string;
    let staffToken: string;
    let createdPlainToken: string;
    let createdTokenId: string;

    beforeAll(async () => {
        await cleanupDatabase();

        tenant = await prisma.tenant.create({
            data: { name: 'Token Tenant', slug: 'token-tenant', timezone: 'UTC' },
        });

        const passwordHash = await bcrypt.hash('Password@123', 10);

        await prisma.user.create({
            data: { email: 'admin@token.com', passwordHash, role: UserRole.ADMIN, tenantId: tenant.id },
        });

        await prisma.user.create({
            data: { email: 'staff@token.com', passwordHash, role: UserRole.STAFF, tenantId: tenant.id },
        });

        const adminLoginRes = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'admin@token.com', password: 'Password@123' });
        adminToken = adminLoginRes.body.data.token;

        const staffLoginRes = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenant.id)
            .send({ email: 'staff@token.com', password: 'Password@123' });
        staffToken = staffLoginRes.body.data.token;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('POST /api/tokens', () => {
        it('should NOT allow staff to create tokens', async () => {
            const res = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ name: 'Integration A' });

            expect(res.status).toBe(403);
        });

        it('should allow admin to create a token', async () => {
            const res = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Integration A' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();

            createdPlainToken = res.body.data.token;
            createdTokenId = res.body.data.id;
        });
    });

    describe('API Key Authentication Middleware', () => {

        // Let's create a dummy protected route temporarily to test the middleware if it's not bound yet.
        // Actually, we can just hit /api/audit (which requires auth) or we map a test route
        const mockApp = express();
        mockApp.use(express.json());
        mockApp.use(apiKeyMiddleware);
        mockApp.use(apiKeyRateLimiter);
        mockApp.get('/test-route', (req: any, res: any) => res.json({ success: true, user: req.user, tenantId: req.tenantId }));


        it('should authenticate correctly with a valid API token', async () => {
            const res = await request(mockApp)
                .get('/test-route')
                .set('X-API-Key', createdPlainToken);

            expect(res.status).toBe(200);
            expect(res.body.tenantId).toBe(tenant.id);
            expect(res.body.user.role).toBe('API');
        });

        it('should reject requests with missing API Token', async () => {
            const res = await request(mockApp)
                .get('/test-route');

            expect(res.status).toBe(401);
        });

        it('should reject requests with invalid secret API Token', async () => {
            const res = await request(mockApp)
                .get('/test-route')
                .set('X-API-Key', `${createdTokenId}.invalidsecret1234`); // Matching ID but wrong secret

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/tokens/:id', () => {
        it('should revoke the token', async () => {
            const res = await request(app)
                .delete(`/api/tokens/${createdTokenId}`)
                .set('X-Tenant-ID', tenant.id)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });

        it('should fail authentication after revocation', async () => {
            const mockAppRevoked = express();
            mockAppRevoked.use(express.json());
            mockAppRevoked.use(apiKeyMiddleware);
            mockAppRevoked.get('/test-route', (req: any, res: any) => res.json({ success: true }));

            const res = await request(mockAppRevoked)
                .get('/test-route')
                .set('X-API-Key', createdPlainToken);

            // Using the previously valid plainToken
            expect(res.status).toBe(401);
            expect(res.body.error.message).toBe('Invalid or revoked API Key');
        });
    });
});
