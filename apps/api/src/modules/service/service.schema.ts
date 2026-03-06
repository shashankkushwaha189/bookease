import { z } from 'zod';

export const createServiceSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    category: z.string().min(1).max(100).default('General'),
    durationMinutes: z.number().int().min(5).max(480),
    bufferBefore: z.number().int().min(0).max(120).default(0),
    bufferAfter: z.number().int().min(0).max(120).default(0),
    price: z.number().nonnegative().optional(),
    isActive: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();
