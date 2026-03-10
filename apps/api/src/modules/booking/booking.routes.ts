import { Router } from 'express';
import { BookingController } from './booking.controller';
import { ConsentService } from '../consent/consent.service';
import { ConsentRepository } from '../consent/consent.repository';
import { EmailService } from '../notifications/email.service';
import { validateBody } from '../../middleware/validate';
import { createBookingSchema, cancelBookingSchema, rescheduleBookingSchema } from './booking.schema';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
const consentRepository = new ConsentRepository();
const consentService = new ConsentService(consentRepository);
const emailService = new EmailService();
const controller = new BookingController(consentService, emailService);

// Public booking route (requires X-Tenant-ID but NO auth)
router.post('/', validateBody(createBookingSchema), controller.createPublicBooking);

// Protected routes - require authentication
router.use(authMiddleware);

// Cancel booking (customer can cancel their own, staff/admin can cancel any)
router.delete('/:bookingId', validateBody(cancelBookingSchema), controller.cancelBooking);

// Reschedule booking (customer can reschedule their own, staff/admin can reschedule any)
router.put('/:bookingId/reschedule', validateBody(rescheduleBookingSchema), controller.rescheduleBooking);

export default router;
