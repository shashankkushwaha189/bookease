"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    customerEmail: zod_1.z.string().email(),
    customerName: zod_1.z.string().min(2),
    startTime: zod_1.z.string().datetime(),
    serviceId: zod_1.z.string().uuid(),
    // Consent is MANDATORY for public booking
    consentGiven: zod_1.z.boolean().refine((val) => val === true, {
        message: 'Consent must be given to proceed with booking',
    }),
});
