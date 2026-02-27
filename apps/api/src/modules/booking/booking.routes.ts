import { Router } from 'express';
import { BookingController } from './booking.controller';
import { ConsentService } from '../consent/consent.service';
import { ConsentRepository } from '../consent/consent.repository';
import { validateBody } from '../../middleware/validate';
import { createBookingSchema } from './booking.schema';

const router = Router();
const consentRepository = new ConsentRepository();
const consentService = new ConsentService(consentRepository);
const controller = new BookingController(consentService);

// Public booking route (requires X-Tenant-ID but NO auth)
router.post('/', validateBody(createBookingSchema), controller.createPublicBooking);

export default router;
