"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenantSchema = exports.createTenantSchema = void 0;
const zod_1 = require("zod");
exports.createTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    slug: zod_1.z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric or hyphenated'),
    timezone: zod_1.z.string().optional().default('UTC'),
});
exports.updateTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    slug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
    timezone: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
