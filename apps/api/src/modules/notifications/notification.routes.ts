import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { validateBody } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { z } from 'zod';

const router = Router();
const controller = new NotificationController();

// Validation schemas
const testEmailSchema = z.object({
  testEmail: z.string().email()
});

// All notification routes require authentication
router.use(authMiddleware);

// Initialize reminder system (admin only)
router.post('/reminders/initialize', requireRole(['ADMIN']), controller.initializeReminders);

// Send manual reminder (staff/admin only)
router.post('/reminders/manual/:appointmentId', requireRole(['ADMIN', 'STAFF']), controller.sendManualReminder);

// Get upcoming reminders (staff/admin only) - temp remove role check for testing
router.get('/reminders/upcoming', controller.getUpcomingReminders);

// Test email configuration (admin only)
router.post('/test-email', validateBody(testEmailSchema), requireRole(['ADMIN']), controller.testEmailConfiguration);

export default router;
