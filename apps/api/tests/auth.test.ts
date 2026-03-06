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

        // Add a USER role customer for testing
        await prisma.user.create({
            data: {
                email: 'customer@tenant-a.com',
                passwordHash,
                role: 'USER',
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

        it('should return 200 and USER token for customer login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                    email: 'customer@tenant-a.com',
                    password,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.user.email).toBe('customer@tenant-a.com');
            expect(response.body.data.user.role).toBe('USER');
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
        it('should generate correct tokens for all user roles', async () => {
            // Test ADMIN role
            const loginAdmin = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'admin@tenant-a.com', password });

            const adminToken = loginAdmin.body.data.token;
            const adminDecoded = jwt.decode(adminToken) as any;
            expect(adminDecoded.role).toBe('ADMIN');

            // Test STAFF role
            const loginStaff = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'staff@tenant-a.com', password });

            const staffToken = loginStaff.body.data.token;
            const staffDecoded = jwt.decode(staffToken) as any;
            expect(staffDecoded.role).toBe('STAFF');

            // Test USER role
            const loginUser = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'customer@tenant-a.com', password });

            const userToken = loginUser.body.data.token;
            const userDecoded = jwt.decode(userToken) as any;
            expect(userDecoded.role).toBe('USER');
        });

        it('should block non-ADMIN users from admin routes', async () => {
            // Test STAFF access to admin route
            const staffLogin = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'staff@tenant-a.com', password });

            const staffResponse = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${staffLogin.body.data.token}`);

            expect(staffResponse.status).toBe(403);
            expect(staffResponse.body.error.code).toBe('FORBIDDEN');

            // Test USER access to admin route
            const userLogin = await request(app)
                .post('/api/auth/login')
                .set('X-Tenant-ID', tenantA.id)
                .send({ email: 'customer@tenant-a.com', password });

            const userResponse = await request(app)
                .get('/api/config/current')
                .set('X-Tenant-ID', tenantA.id)
                .set('Authorization', `Bearer ${userLogin.body.data.token}`);

            expect(userResponse.status).toBe(403);
            expect(userResponse.body.error.code).toBe('FORBIDDEN');
        });
    });
});
