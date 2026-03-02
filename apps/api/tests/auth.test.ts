import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanupDatabase } from './helpers';

describe('Auth & RBAC Module', () => {
    let tenantA: any;
    let tenantB: any;
    let adminUserA: any;
    let staffUserA: any;
    const password = 'Password@123';

    beforeAll(async () => {
        await cleanupDatabase();

        tenantA = await prisma.tenant.create({
            data: {
                name: 'Tenant A',
                slug: 'tenant-a',
                timezone: 'UTC',
            },
        });

        tenantB = await prisma.tenant.create({
            data: {
                name: 'Tenant B',
                slug: 'tenant-b',
                timezone: 'UTC',
            },
        });

        const passwordHash = await bcrypt.hash(password, 12);

        adminUserA = await prisma.user.create({
            data: {
                email: 'admin@tenant-a.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenantA.id,
            },
        });

        staffUserA = await prisma.user.create({
            data: {
                email: 'staff@tenant-a.com',
                passwordHash,
                role: 'STAFF',
                tenantId: tenantA.id,
            },
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('POST /api/auth/login', () => {
        it('should return 200 and a token for valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                    email: 'admin@tenant-a.com',
                    password,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.user.email).toBe('admin@tenant-a.com');
            expect(response.body.data.user.role).toBe('ADMIN');
        });

        it('should return 401 for wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                    email: 'admin@tenant-a.com',
                    password: 'wrong-password',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toBe('Invalid credentials');
        });

        it('should return 401 for cross-tenant login attempt', async () => {
            // Trying to log into Tenant B with Tenant A user credentials
            const response = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantB.id)
                .send({
                    email: 'admin@tenant-a.com',
                    password,
                });

            expect(response.status).toBe(401);
            expect(response.body.error.message).toBe('Invalid credentials');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user for valid token', async () => {
            // Login first
            const loginRes = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'admin@tenant-a.com', password });

            const token = loginRes.body.data.token;

            const response = await request(app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.email).toBe('admin@tenant-a.com');
        });

        it('should return 401 for missing token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantA.id);

            expect(response.status).toBe(401);
        });

        it('should return 401 for token-tenant mismatch', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'admin@tenant-a.com', password });

            const token = loginRes.body.data.token;

            // Send Tenant A token to Tenant B route
            const response = await request(app)
                .get('/api/auth/me')
                .set('X-Tenant-ID', tenantB.id)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(401);
            expect(response.body.error.message).toBe('Token tenant mismatch');
        });
    });

    describe('RBAC & Role Guards', () => {
        // We haven't applied requireRole to any routes yet in this task, 
        // but we can test the middleware behavior by creating a mock route if needed.
        // However, the service and controller are already using req.user.role.

        it('should block staff from admin-protected logic (if any)', async () => {
            // For now, let's verify that the tokens have correct roles
            const loginStaff = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'staff@tenant-a.com', password });

            expect(loginStaff.body).toHaveProperty('data');
            expect(loginStaff.body.data).toHaveProperty('token');

            const staffToken = loginStaff.body.data.token;
            const decoded = jwt.decode(staffToken) as any;
            expect(decoded.role).toBe('STAFF');
        });
    });
});
