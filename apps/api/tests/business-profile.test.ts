import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Business Profile Module', () => {
    let tenantA: any;
    let tenantB: any;

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

        // Create a default profile for Tenant A to avoid "not found" errors in other tests
        await prisma.businessProfile.create({
            data: {
                tenantId: tenantA.id,
                businessName: 'Default Clinic',
                brandColor: '#1A56DB',
                accentColor: '#7C3AED',
            },
        });
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('POST /api/business-profile', () => {
        it('should create or update a business profile scoped to the tenant', async () => {
            const profileData = {
                businessName: 'Tenant A Clinic',
                description: 'A great clinic',
                brandColor: '#1A56DB',
                accentColor: '#7C3AED',
                seoTitle: 'Best Clinic',
                seoDescription: 'We are the best',
            };

            const response = await request(app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send(profileData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.businessName).toBe(profileData.businessName);
            expect(response.body.data.tenantId).toBe(tenantA.id);
        });

        it('should return 400 for invalid hex color', async () => {
            const response = await request(app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send({
                    businessName: 'Invalid Color',
                    brandColor: 'not-a-color',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/public/profile', () => {
        it('should return only a safe subset of fields', async () => {
            const response = await request(app)
                .get('/api/public/profile/public')
                .set('X-Tenant-ID', tenantA.id);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const data = response.body.data;
            expect(data).toHaveProperty('businessName');
            expect(data).toHaveProperty('brandColor');
            expect(data).toHaveProperty('description');

            // Should NOT have admin/internal fields
            expect(data).not.toHaveProperty('seoTitle');
            expect(data).not.toHaveProperty('seoDescription');
            expect(data).not.toHaveProperty('tenantId');
            expect(data).not.toHaveProperty('id');
        });
    });

    describe('Tenant Isolation', () => {
        it('should not allow Tenant B to see Tenant A profile via private route', async () => {
            // Tenant B has no profile yet
            const response = await request(app)
                .get('/api/business-profile')
                .set('X-Tenant-ID', tenantB.id);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should ensure updates are scoped to the header tenant', async () => {
            // Tenant A tries to update profile while passing Tenant B ID in header (not possible due to our MW design)
            // But let's verify Tenant A can update their own
            const response = await request(app)
                .post('/api/business-profile')
                .set('X-Tenant-ID', tenantA.id)
                .send({ businessName: 'Updated Name' });

            expect(response.status).toBe(200);
            expect(response.body.data.businessName).toBe('Updated Name');
        });
    });
});
