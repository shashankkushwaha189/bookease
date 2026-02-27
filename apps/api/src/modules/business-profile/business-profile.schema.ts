import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color');

export const createBusinessProfileSchema = z.object({
    businessName: z.string().min(2).max(100),
    logoUrl: z.string().url().optional().or(z.literal('')),
    description: z.string().max(500).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    brandColor: hexColorSchema.default('#1A56DB'),
    accentColor: hexColorSchema.default('#7C3AED'),
    policyText: z.string().max(2000).optional(),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
});

export const updateBusinessProfileSchema = createBusinessProfileSchema.partial();

export type CreateBusinessProfileInput = z.infer<typeof createBusinessProfileSchema>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
