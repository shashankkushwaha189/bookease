"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBusinessProfileSchema = exports.createBusinessProfileSchema = void 0;
const zod_1 = require("zod");
const hexColorSchema = zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color');
exports.createBusinessProfileSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2).max(100),
    logoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    description: zod_1.z.string().max(500).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    address: zod_1.z.string().optional(),
    brandColor: hexColorSchema.default('#1A56DB'),
    accentColor: hexColorSchema.default('#7C3AED'),
    policyText: zod_1.z.string().max(2000).optional(),
    seoTitle: zod_1.z.string().max(70).optional(),
    seoDescription: zod_1.z.string().max(160).optional(),
});
exports.updateBusinessProfileSchema = exports.createBusinessProfileSchema.partial();
