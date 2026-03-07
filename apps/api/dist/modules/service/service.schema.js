"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServiceSchema = exports.createServiceSchema = void 0;
const zod_1 = require("zod");
exports.createServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
    category: zod_1.z.string().min(1).max(100).default('General'),
    durationMinutes: zod_1.z.number().int().min(5).max(480),
    bufferBefore: zod_1.z.number().int().min(0).max(120).default(0),
    bufferAfter: zod_1.z.number().int().min(0).max(120).default(0),
    price: zod_1.z.number().nonnegative().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateServiceSchema = exports.createServiceSchema.partial();
