import { z } from 'zod';

export const createBookingSchema = z.object({
    customerEmail: z.string().email(),
    customerName: z.string().min(2),
    startTime: z.string().datetime(),
    serviceId: z.string().uuid(),
    // Consent is MANDATORY for public booking
    consentGiven: z.boolean().refine((val) => val === true, {
        message: 'Consent must be given to proceed with booking',
    }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
