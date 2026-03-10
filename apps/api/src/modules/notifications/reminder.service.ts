import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

const prisma = new PrismaClient();

export class ReminderService {
  constructor(private emailService: EmailService) {}

  initializeReminderCron() {
    // Run every hour to check for appointments that need reminders
    cron.schedule('0 * * * *', async () => {
      logger.info('Running reminder check cron job');
      await this.sendReminders();
    });

    // Run every day at 9 AM for 24-hour reminders
    cron.schedule('0 9 * * *', async () => {
      logger.info('Running 24-hour reminder check');
      await this.send24HourReminders();
    });

    logger.info('Reminder cron jobs initialized');
  }

  private async sendReminders() {
    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find appointments that need reminders (2 hours before and 24 hours before)
      const appointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['BOOKED', 'CONFIRMED'] },
          startTimeUtc: {
            gte: now,
            lte: twentyFourHoursFromNow
          },
          // Only send reminders for appointments in the future
          AND: [
            { startTimeUtc: { gte: now } }
          ]
        },
        include: {
          customer: true,
          service: true,
          staff: true
        }
      });

      for (const appointment of appointments) {
        const timeUntilAppointment = appointment.startTimeUtc.getTime() - now.getTime();
        const hoursUntil = timeUntilAppointment / (1000 * 60 * 60);

        // Send 24-hour reminder
        if (hoursUntil <= 24 && hoursUntil > 23) {
          await this.sendReminderEmail(appointment, '24-hour');
        }
        // Send 2-hour reminder
        else if (hoursUntil <= 2 && hoursUntil > 1.9) {
          await this.sendReminderEmail(appointment, '2-hour');
        }
      }

      logger.info(`Processed ${appointments.length} appointments for reminders`);
    } catch (error) {
      logger.error({ error }, 'Failed to send reminders');
    }
  }

  private async send24HourReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['BOOKED', 'CONFIRMED'] },
          startTimeUtc: {
            gte: tomorrow,
            lte: dayAfter
          }
        },
        include: {
          customer: true,
          service: true,
          staff: true
        }
      });

      for (const appointment of appointments) {
        await this.sendReminderEmail(appointment, '24-hour');
      }

      logger.info(`Sent 24-hour reminders for ${appointments.length} appointments`);
    } catch (error) {
      logger.error({ error }, 'Failed to send 24-hour reminders');
    }
  }

  private async sendReminderEmail(appointment: any, type: '24-hour' | '2-hour') {
    try {
      await this.emailService.sendReminderEmail({
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        dateTime: new Date(appointment.startTimeUtc).toLocaleString(),
        referenceId: appointment.referenceId,
        notes: appointment.notes
      });

      logger.info({ 
        appointmentId: appointment.id, 
        type, 
        customerEmail: appointment.customer.email 
      }, 'Reminder email sent');
    } catch (error) {
      logger.error({ 
        error, 
        appointmentId: appointment.id, 
        type 
      }, 'Failed to send reminder email');
    }
  }

  // Manual reminder sending for testing
  async sendManualReminder(appointmentId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: true,
          service: true,
          staff: true
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      await this.sendReminderEmail(appointment, 'manual');
      
      logger.info({ appointmentId }, 'Manual reminder sent');
      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      logger.error({ error, appointmentId }, 'Failed to send manual reminder');
      throw error;
    }
  }

  // Get upcoming reminders for admin dashboard
  async getUpcomingReminders(hours: number = 24) {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: { in: ['BOOKED', 'CONFIRMED'] },
          startTimeUtc: {
            gte: now,
            lte: endTime
          }
        },
        include: {
          customer: true,
          service: true,
          staff: true
        },
        orderBy: {
          startTimeUtc: 'asc'
        }
      });

      return appointments.map(apt => ({
        ...apt,
        timeUntilAppointment: Math.max(0, apt.startTimeUtc.getTime() - now.getTime()),
        reminderType: this.getReminderType(apt.startTimeUtc, now)
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get upcoming reminders');
      throw error;
    }
  }

  private getReminderType(appointmentTime: Date, now: Date): '24-hour' | '2-hour' | 'none' {
    const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil <= 2 && hoursUntil > 0) return '2-hour';
    if (hoursUntil <= 24 && hoursUntil > 0) return '24-hour';
    return 'none';
  }
}
