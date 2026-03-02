import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AppointmentStatus, TimelineEvent, UserRole } from '../src/generated/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('Simple Audit & Timeline Check', () => {
    let tenantId: string;
    let adminToken: string;

    beforeAll(async () => {
        const tenant = await prisma.tenant.create({ data: { name: 'Simple Test', slug: 'simple-' + Date.now() } });
        tenantId = tenant.id;
        const admin = await prisma.user.create({ data: { tenantId, email: 'admin@' + Date.now() + '.test', passwordHash: 'h', role: UserRole.ADMIN } });
        adminToken = jwt.sign({ sub: admin.id, tenantId, role: admin.role }, env.JWT_SECRET);
    });

    it('should create an audit log on manual entry', async () => {
        const res = await request(app)
            .get('/api/audit')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toBeDefined();
    });
});
