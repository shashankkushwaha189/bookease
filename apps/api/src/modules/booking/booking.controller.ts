import { Request, Response, NextFunction } from 'express';
import { ConsentService } from '../consent/consent.service';
import { availabilityController } from '../availability/availability.controller';
import { EmailService } from '../notifications/email.service';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

const prisma = new PrismaClient();

// Booking validation schema
const createBookingSchema = z.object({
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
  consentGiven: z.boolean(),
  sessionToken: z.string().optional()
});

export class BookingController {
    constructor(
      private consentService: ConsentService,
      private emailService: EmailService
    ) { }

    createPublicBooking = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.tenantId!;
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0') as string;
        
        // Validate request body
        const validatedData = createBookingSchema.parse(req.body);
        const { serviceId, staffId, customer, startTimeUtc, endTimeUtc, notes, consentGiven, sessionToken } = validatedData;

        // 1. Consent is mandatory
        if (!consentGiven) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CONSENT_REQUIRED',
              message: 'Consent must be given to proceed with booking',
            },
          });
        }

        // 2. Check if service exists and is available
        const service = await prisma.service.findFirst({
          where: {
            id: serviceId,
            tenantId,
            isActive: true
          }
        });

        if (!service) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'SERVICE_NOT_FOUND',
              message: 'Service not found or not available',
            },
          });
        }

        // 3. Check if staff exists and is available
        const staff = await prisma.staff.findFirst({
          where: {
            id: staffId,
            tenantId,
            isActive: true
          }
        });

        if (!staff) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'STAFF_NOT_FOUND',
              message: 'Staff member not found or not available',
            },
          });
        }

        // 4. Check for booking conflicts
        const existingBooking = await prisma.appointment.findFirst({
          where: {
            tenantId,
            staffId,
            status: { in: ['BOOKED', 'CONFIRMED'] },
            OR: [
              {
                startTimeUtc: { lt: new Date(endTimeUtc) },
                endTimeUtc: { gt: new Date(startTimeUtc) }
              }
            ]
          }
        });

        if (existingBooking) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'SLOT_NOT_AVAILABLE',
              message: 'Time slot is no longer available',
            },
          });
        }

        // 5. Create or find customer
        let customerRecord = await prisma.customer.findFirst({
          where: {
            tenantId,
            email: customer.email
          }
        });

        if (!customerRecord) {
          customerRecord = await prisma.customer.create({
            data: {
              tenantId,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              status: 'ACTIVE'
            }
          });
        }

        // 6. Create the booking
        const appointment = await prisma.appointment.create({
          data: {
            tenantId,
            serviceId,
            staffId,
            customerId: customerRecord.id,
            startTimeUtc: new Date(startTimeUtc),
            endTimeUtc: new Date(endTimeUtc),
            status: 'BOOKED',
            notes: notes || `Public booking from ${customer.name}`,
            referenceId: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
          include: {
            customer: true,
            service: true,
            staff: true,
          }
        });

        // 7. Capture consent
        await this.consentService.captureConsent(
          tenantId,
          customer.email,
          ipAddress
        );

        // 8. Invalidate availability cache
        const invalidatedCount = availabilityController.invalidateCache(tenantId);
        
        logger.info({ 
          tenantId, 
          appointmentId: appointment.id,
          customerEmail: customer.email,
          invalidatedCount 
        }, 'Public booking created successfully');

        // 9. Send confirmation email (async)
        this.sendBookingConfirmation(appointment).catch(error => {
          logger.error({ error, appointmentId: appointment.id }, 'Failed to send booking confirmation');
        });

        res.status(201).json({
          success: true,
          data: appointment,
          message: 'Booking created successfully'
        });

      } catch (error: any) {
        logger.error({ error: error.message, tenantId: req.tenantId }, 'Public booking failed');
        
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid booking data',
              details: error.errors
            }
          });
        }

        if (error.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'DUPLICATE_BOOKING',
              message: 'Duplicate booking detected'
            }
          });
        }

        res.status(500).json({
          success: false,
          error: {
            code: 'BOOKING_FAILED',
            message: 'Failed to create booking'
          }
        });
      }
    };

    cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bookingId } = req.params;
        const tenantId = req.tenantId!;
        const { reason } = req.body;

        const appointment = await prisma.appointment.findFirst({
          where: {
            id: bookingId,
            tenantId,
            status: { in: ['BOOKED', 'CONFIRMED'] }
          },
          include: {
            customer: true,
            service: true,
            staff: true
          }
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'BOOKING_NOT_FOUND',
              message: 'Booking not found or cannot be cancelled'
            }
          });
        }

        const updatedAppointment = await prisma.appointment.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            notes: appointment.notes + (reason ? `\nCancellation reason: ${reason}` : '')
          },
          include: {
            customer: true,
            service: true,
            staff: true
          }
        });

        // Invalidate cache
        availabilityController.invalidateCache(tenantId);

        // Send cancellation email
        this.sendCancellationEmail(updatedAppointment, reason).catch(error => {
          logger.error({ error, appointmentId: bookingId }, 'Failed to send cancellation email');
        });

        logger.info({ tenantId, appointmentId: bookingId }, 'Booking cancelled successfully');

        res.json({
          success: true,
          data: updatedAppointment,
          message: 'Booking cancelled successfully'
        });

      } catch (error: any) {
        logger.error({ error: error.message, tenantId: req.tenantId }, 'Booking cancellation failed');
        
        res.status(500).json({
          success: false,
          error: {
            code: 'CANCELLATION_FAILED',
            message: 'Failed to cancel booking'
          }
        });
      }
    };

    rescheduleBooking = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bookingId } = req.params;
        const tenantId = req.tenantId!;
        const { newStartTimeUtc, newEndTimeUtc, reason } = req.body;

        const appointment = await prisma.appointment.findFirst({
          where: {
            id: bookingId,
            tenantId,
            status: { in: ['BOOKED', 'CONFIRMED'] }
          }
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'BOOKING_NOT_FOUND',
              message: 'Booking not found or cannot be rescheduled'
            }
          });
        }

        // Check for conflicts in new time slot
        const conflict = await prisma.appointment.findFirst({
          where: {
            tenantId,
            staffId: appointment.staffId,
            status: { in: ['BOOKED', 'CONFIRMED'] },
            id: { not: bookingId },
            OR: [
              {
                startTimeUtc: { lt: new Date(newEndTimeUtc) },
                endTimeUtc: { gt: new Date(newStartTimeUtc) }
              }
            ]
          }
        });

        if (conflict) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'SLOT_NOT_AVAILABLE',
              message: 'New time slot is not available'
            }
          });
        }

        const updatedAppointment = await prisma.appointment.update({
          where: { id: bookingId },
          data: {
            startTimeUtc: new Date(newStartTimeUtc),
            endTimeUtc: new Date(newEndTimeUtc),
            notes: appointment.notes + (reason ? `\nRescheduled: ${reason}` : '')
          },
          include: {
            customer: true,
            service: true,
            staff: true
          }
        });

        // Invalidate cache
        availabilityController.invalidateCache(tenantId);

        // Send reschedule email
        this.sendRescheduleEmail(updatedAppointment, newStartTimeUtc, newEndTimeUtc, reason).catch(error => {
          logger.error({ error, appointmentId: bookingId }, 'Failed to send reschedule email');
        });

        logger.info({ tenantId, appointmentId: bookingId }, 'Booking rescheduled successfully');

        res.json({
          success: true,
          data: updatedAppointment,
          message: 'Booking rescheduled successfully'
        });

      } catch (error: any) {
        logger.error({ error: error.message, tenantId: req.tenantId }, 'Booking rescheduling failed');
        
        res.status(500).json({
          success: false,
          error: {
            code: 'RESCHEDULE_FAILED',
            message: 'Failed to reschedule booking'
          }
        });
      }
    };

    // Email notification methods
    private async sendBookingConfirmation(appointment: any) {
      try {
        await this.emailService.sendBookingConfirmation({
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          dateTime: new Date(appointment.startTimeUtc).toLocaleString(),
          referenceId: appointment.referenceId,
          notes: appointment.notes
        });
      } catch (error) {
        logger.error({ error, appointmentId: appointment.id }, 'Failed to send booking confirmation email');
      }
    }

    private async sendCancellationEmail(appointment: any, reason?: string) {
      try {
        await this.emailService.sendCancellationEmail({
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          dateTime: new Date(appointment.startTimeUtc).toLocaleString(),
          referenceId: appointment.referenceId,
          notes: appointment.notes,
          reason
        });
      } catch (error) {
        logger.error({ error, appointmentId: appointment.id }, 'Failed to send cancellation email');
      }
    }

    private async sendRescheduleEmail(appointment: any, newStartTimeUtc: string, newEndTimeUtc: string, reason?: string) {
      try {
        await this.emailService.sendRescheduleEmail({
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          dateTime: new Date(appointment.startTimeUtc).toLocaleString(),
          referenceId: appointment.referenceId,
          notes: appointment.notes,
          newDateTime: new Date(newStartTimeUtc).toLocaleString(),
          reason
        });
      } catch (error) {
        logger.error({ error, appointmentId: appointment.id }, 'Failed to send reschedule email');
      }
    }
}
