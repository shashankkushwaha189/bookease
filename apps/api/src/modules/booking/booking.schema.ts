import { z } from 'zod';

export const createBookingSchema = z.object({
    serviceId: z.string().uuid(),
    staffId: z.string().uuid(),
    customer: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional()
    }),
    startTimeUtc: z.string().datetime(),
    endTimeUtc: z.string().datetime(),
    notes: z.string().optional(),
    consentGiven: z.boolean().refine((val) => val === true, {
        message: 'Consent must be given to proceed with booking',
    }),
    sessionToken: z.string().optional()
});

export const cancelBookingSchema = z.object({
    reason: z.string().optional()
});

export const rescheduleBookingSchema = z.object({
    newStartTimeUtc: z.string().datetime(),
    newEndTimeUtc: z.string().datetime(),
    reason: z.string().optional()
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
