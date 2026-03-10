import { Request, Response, NextFunction } from 'express';
import { ReminderService } from './reminder.service';
import { EmailService } from './email.service';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

export class NotificationController {
  private reminderService: ReminderService;

  constructor() {
    const emailService = new EmailService();
    this.reminderService = new ReminderService(emailService);
  }

  // Initialize reminder system
  initializeReminders = (req: Request, res: Response) => {
    try {
      this.reminderService.initializeReminderCron();
      res.json({
        success: true,
        message: 'Reminder system initialized successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to initialize reminder system');
      res.status(500).json({
        success: false,
        error: {
          code: 'REMINDER_INIT_FAILED',
          message: 'Failed to initialize reminder system'
        }
      });
    }
  };

  // Send manual reminder
  sendManualReminder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { appointmentId } = req.params;
      const tenantId = req.tenantId!;

      // Note: In a real implementation, you'd check if the user has permission to send reminders for this appointment
      const result = await this.reminderService.sendManualReminder(appointmentId);
      
      res.json({
        success: true,
        data: result,
        message: 'Manual reminder sent successfully'
      });
    } catch (error: any) {
      logger.error({ error, appointmentId: req.params.appointmentId }, 'Failed to send manual reminder');
      
      res.status(500).json({
        success: false,
        error: {
          code: 'MANUAL_REMINDER_FAILED',
          message: 'Failed to send manual reminder'
        }
      });
    }
  };

  // Get upcoming reminders
  getUpcomingReminders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { hours = 24 } = req.query;
      const tenantId = req.tenantId!;

      const reminders = await this.reminderService.getUpcomingReminders(Number(hours));
      
      res.json({
        success: true,
        data: reminders,
        message: 'Upcoming reminders retrieved successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get upcoming reminders');
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REMINDERS_FETCH_FAILED',
          message: 'Failed to get upcoming reminders'
        }
      });
    }
  };

  // Test email configuration
  testEmailConfiguration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { testEmail } = req.body;
      const emailService = new EmailService();
      
      await emailService.sendBookingConfirmation({
        customerName: 'Test User',
        customerEmail: testEmail,
        serviceName: 'Test Service',
        staffName: 'Test Staff',
        dateTime: new Date().toLocaleString(),
        referenceId: 'TEST-123',
        notes: 'This is a test email'
      });
      
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to send test email');
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_EMAIL_FAILED',
          message: 'Failed to send test email'
        }
      });
    }
  };
}
