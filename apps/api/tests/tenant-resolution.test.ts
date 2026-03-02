import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

import { cleanupDatabase } from './helpers';

describe('Tenant Resolution Middleware', () => {
    let tenantA: any;
    let tenantB: any;
    let inactiveTenant: any;

    beforeAll(async () => {
        // Cleanup
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

        inactiveTenant = await prisma.tenant.create({
            data: {
                name: 'Inactive Tenant',
                slug: 'inactive',
                timezone: 'UTC',
                isActive: false,
            },
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('should return 403 if X-Tenant-ID header is missing', async () => {
        const response = await request(app).get('/api/public/services');
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('TENANT_ID_REQUIRED');
    });

    it('should return 403 if tenant does not exist', async () => {
        const response = await request(app)
            .get('/api/public/services')
            .set('X-Tenant-ID', '00000000-0000-0000-0000-000000000000');
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('should return 403 if tenant is inactive', async () => {
        const response = await request(app)
            .get('/api/public/services')
            .set('X-Tenant-ID', inactiveTenant.id);
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('TENANT_INACTIVE');
    });

    it('should return 200 if tenant ID is valid and active', async () => {
        const response = await request(app)
            .get('/api/public/services')
            .set('X-Tenant-ID', tenantA.id);

        // The endpoint exists and we have a valid tenant ID
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow /health without X-Tenant-ID', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });
});
