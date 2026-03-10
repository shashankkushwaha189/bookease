import nodemailer from 'nodemailer';

const { createTransport } = nodemailer;

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  dateTime: string;
  referenceId: string;
  notes?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    // Check if email configuration is available
    const hasEmailConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
    
    if (!hasEmailConfig) {
      logger.warn('Email configuration missing - emails will be logged only');
      this.transporter = null;
      return;
    }

    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@bookease.com';

    try {
      this.transporter = createTransport(config);

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.warn('Email service connection failed - emails will be logged only', error);
          this.transporter = null;
        } else {
          logger.info('Email service connected successfully');
        }
      });
    } catch (error) {
      logger.warn('Email service initialization failed - emails will be logged only', error);
      this.transporter = null;
    }
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    try {
      const subject = `Booking Confirmation - ${data.referenceId}`;
      const html = this.generateBookingConfirmationHTML(data);

      if (!this.transporter) {
        logger.info('Email service not configured - logging booking confirmation', {
          customerEmail: data.customerEmail,
          referenceId: data.referenceId,
          type: 'booking_confirmation'
        });
        return;
      }

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: data.customerEmail,
        subject,
        html
      });

      logger.info({ 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Booking confirmation email sent');
    } catch (error) {
      logger.error({ 
        error, 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Failed to send booking confirmation email');
      // Don't throw error - don't fail booking due to email issues
    }
  }

  async sendCancellationEmail(data: BookingEmailData & { reason?: string }): Promise<void> {
    try {
      const subject = `Booking Cancelled - ${data.referenceId}`;
      const html = this.generateCancellationHTML(data);

      if (!this.transporter) {
        logger.info('Email service not configured - logging cancellation', {
          customerEmail: data.customerEmail,
          referenceId: data.referenceId,
          type: 'cancellation'
        });
        return;
      }

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: data.customerEmail,
        subject,
        html
      });

      logger.info({ 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Cancellation email sent');
    } catch (error) {
      logger.error({ 
        error, 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Failed to send cancellation email');
    }
  }

  async sendRescheduleEmail(data: BookingEmailData & { newDateTime: string; reason?: string }): Promise<void> {
    try {
      const subject = `Booking Rescheduled - ${data.referenceId}`;
      const html = this.generateRescheduleHTML(data);

      if (!this.transporter) {
        logger.info('Email service not configured - logging reschedule', {
          customerEmail: data.customerEmail,
          referenceId: data.referenceId,
          type: 'reschedule'
        });
        return;
      }

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: data.customerEmail,
        subject,
        html
      });

      logger.info({ 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Reschedule email sent');
    } catch (error) {
      logger.error({ 
        error, 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Failed to send reschedule email');
    }
  }

  async sendReminderEmail(data: BookingEmailData): Promise<void> {
    try {
      const subject = `Booking Reminder - ${data.referenceId}`;
      const html = this.generateReminderHTML(data);

      if (!this.transporter) {
        logger.info('Email service not configured - logging reminder', {
          customerEmail: data.customerEmail,
          referenceId: data.referenceId,
          type: 'reminder'
        });
        return;
      }

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: data.customerEmail,
        subject,
        html
      });

      logger.info({ 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Reminder email sent');
    } catch (error) {
      logger.error({ 
        error, 
        customerEmail: data.customerEmail, 
        referenceId: data.referenceId 
      }, 'Failed to send reminder email');
    }
  }

  private generateBookingConfirmationHTML(data: BookingEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed! 🎉</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking has been confirmed successfully. Here are your booking details:</p>
            
            <div class="booking-details">
              <h3>Booking Details</h3>
              <p><strong>Reference ID:</strong> ${data.referenceId}</p>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Staff:</strong> ${data.staffName}</p>
              <p><strong>Date & Time:</strong> ${data.dateTime}</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>

            <p>Please arrive 10 minutes before your scheduled time. If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>

            <div style="text-align: center;">
              <a href="#" class="btn">Add to Calendar</a>
              <a href="#" class="btn">Manage Booking</a>
            </div>

            <p>Thank you for choosing our service!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 BookEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCancellationHTML(data: BookingEmailData & { reason?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking has been cancelled as requested. Here are the details:</p>
            
            <div class="booking-details">
              <h3>Cancelled Booking</h3>
              <p><strong>Reference ID:</strong> ${data.referenceId}</p>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Staff:</strong> ${data.staffName}</p>
              <p><strong>Original Date & Time:</strong> ${data.dateTime}</p>
              ${data.reason ? `<p><strong>Cancellation Reason:</strong> ${data.reason}</p>` : ''}
            </div>

            <p>If you didn't request this cancellation, please contact us immediately.</p>
            <p>We hope to see you again soon!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 BookEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateRescheduleHTML(data: BookingEmailData & { newDateTime: string; reason?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Rescheduled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Rescheduled</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking has been rescheduled. Here are the updated details:</p>
            
            <div class="booking-details">
              <h3>Updated Booking Details</h3>
              <p><strong>Reference ID:</strong> ${data.referenceId}</p>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Staff:</strong> ${data.staffName}</p>
              <p><strong>Previous Date & Time:</strong> ${data.dateTime}</p>
              <p><strong>New Date & Time:</strong> ${data.newDateTime}</p>
              ${data.reason ? `<p><strong>Reschedule Reason:</strong> ${data.reason}</p>` : ''}
            </div>

            <p>Please make note of your new appointment time. If you need any further changes, please contact us.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 BookEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateReminderHTML(data: BookingEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Reminder ⏰</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            
            <div class="booking-details">
              <h3>Upcoming Appointment</h3>
              <p><strong>Reference ID:</strong> ${data.referenceId}</p>
              <p><strong>Service:</strong> ${data.serviceName}</p>
              <p><strong>Staff:</strong> ${data.staffName}</p>
              <p><strong>Date & Time:</strong> ${data.dateTime}</p>
            </div>

            <p>Please arrive 10 minutes before your scheduled time. If you need to cancel or reschedule, please do so as soon as possible.</p>
            <p>We look forward to seeing you!</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2024 BookEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
