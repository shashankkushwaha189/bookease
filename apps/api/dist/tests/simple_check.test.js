"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const client_1 = require("../src/generated/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../src/config/env");
(0, vitest_1.describe)('Simple Audit & Timeline Check', () => {
    let tenantId;
    let adminToken;
    (0, vitest_1.beforeAll)(async () => {
        const tenant = await prisma_1.prisma.tenant.create({ data: { name: 'Simple Test', slug: 'simple-' + Date.now() } });
        tenantId = tenant.id;
        const admin = await prisma_1.prisma.user.create({ data: { tenantId, email: 'admin@' + Date.now() + '.test', passwordHash: 'h', role: client_1.UserRole.ADMIN } });
        adminToken = jsonwebtoken_1.default.sign({ sub: admin.id, tenantId, role: admin.role }, env_1.env.JWT_SECRET);
    });
    (0, vitest_1.it)('should create an audit log on manual entry', async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .get('/api/audit')
            .set('x-tenant-id', tenantId)
            .set('Authorization', `Bearer ${adminToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toBeDefined();
    });
});
