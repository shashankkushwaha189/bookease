import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Tenant Module', () => {
    const testTenant = {
        name: 'Test Clinic',
        slug: 'test-clinic',
    };

    let tenantId: string;

    beforeAll(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('POST /api/tenants should create a tenant', async () => {
        const response = await request(app)
            .post('/api/tenants')
            .send(testTenant);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(testTenant.name);
        expect(response.body.data.slug).toBe(testTenant.slug);
        expect(response.body.data.id).toBeDefined();

        tenantId = response.body.data.id;
    });

    it('POST /api/tenants should return 409 for duplicate slug', async () => {
        const response = await request(app)
            .post('/api/tenants')
            .send(testTenant);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFLICT');
    });

    it('GET /api/tenants/:id should return the tenant', async () => {
        const response = await request(app).get(`/api/tenants/${tenantId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(tenantId);
    });

    it('DELETE /api/tenants/:id should soft delete the tenant', async () => {
        const response = await request(app).delete(`/api/tenants/${tenantId}`);

        expect(response.status).toBe(204);

        // Verify it's gone from normal GET
        const getResponse = await request(app).get(`/api/tenants/${tenantId}`);
        expect(getResponse.status).toBe(404);
    });
});
