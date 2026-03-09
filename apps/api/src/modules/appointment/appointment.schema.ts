import { z } from 'zod';

// Appointment status enum
export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
}

// Appointment creation schema
export const createAppointmentSchema = z.object({
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.BOOKED),
  requiresConfirmation: z.boolean().default(false),
  createdBy: z.string().min(1), // User or system creating the appointment
});

export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>;

// Appointment update schema
export const updateAppointmentSchema = z.object({
  startTimeUtc: z.string().datetime().optional(),
  endTimeUtc: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  updatedBy: z.string().min(1),
});

export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;

// Slot lock schema
export const slotLockSchema = z.object({
  id: z.string().uuid().optional(),
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  lockType: z.enum(['BOOKING', 'RESCHEDULE', 'MANUAL']).default('BOOKING'),
  ttlMinutes: z.number().int().min(2).max(5).default(3), // 2-5 minutes TTL
  createdAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  createdBy: z.string().min(1),
});

export type SlotLock = z.infer<typeof slotLockSchema>;

// Reschedule request schema
export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  newStartTimeUtc: z.string().datetime(),
  newEndTimeUtc: z.string().datetime(),
  reason: z.string().max(500).optional(),
  rescheduledBy: z.string().min(1),
  notifyCustomer: z.boolean().default(true),
});

export type RescheduleAppointmentData = z.infer<typeof rescheduleAppointmentSchema>;

// Manual booking schema (for staff creating appointments)
export const manualBookingSchema = z.object({
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  overrideAvailability: z.boolean().default(false), // Override availability checks
  createdBy: z.string().min(1),
});

export type ManualBookingData = z.infer<typeof manualBookingSchema>;

// Appointment response schema
export const appointmentResponseSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  serviceId: z.string(),
  customerId: z.string(),
  referenceId: z.string(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  status: z.nativeEnum(AppointmentStatus),
  notes: z.string().optional(),
  requiresConfirmation: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  confirmedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  // Related data
  staff: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
  }).optional(),
  service: z.object({
    id: z.string(),
    name: z.string(),
    durationMinutes: z.number(),
    price: z.number().optional(),
  }).optional(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});

export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;

// Conflict detection schema
export const appointmentConflictSchema = z.object({
  hasConflict: z.boolean(),
  conflictingAppointments: z.array(z.object({
    id: z.string(),
    startTimeUtc: z.string().datetime(),
    endTimeUtc: z.string().datetime(),
    status: z.nativeEnum(AppointmentStatus),
    customerName: z.string(),
  })),
  availableSlots: z.array(z.object({
    start: z.string(),
    end: z.string(),
  })).optional(),
});

export type AppointmentConflict = z.infer<typeof appointmentConflictSchema>;

// Status transition schema
export const statusTransitionSchema = z.object({
  fromStatus: z.nativeEnum(AppointmentStatus),
  toStatus: z.nativeEnum(AppointmentStatus),
  allowed: z.boolean(),
  reason: z.string().optional(),
});

export type StatusTransition = z.infer<typeof statusTransitionSchema>;

// Booking attempt schema
export const bookingAttemptSchema = z.object({
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  attemptAt: z.string().datetime(),
  success: z.boolean(),
  failureReason: z.string().optional(),
  lockId: z.string().optional(),
});

export type BookingAttempt = z.infer<typeof bookingAttemptSchema>;

// Performance metrics schema
export const appointmentMetricsSchema = z.object({
  totalBookings: z.number(),
  successfulBookings: z.number(),
  failedBookings: z.number(),
  concurrentBookings: z.number(),
  averageBookingTime: z.number(), // in milliseconds
  lockExpirations: z.number(),
  reschedules: z.number(),
  cancellations: z.number(),
  noShows: z.number(),
  lastReset: z.string().datetime(),
});

export type AppointmentMetrics = z.infer<typeof appointmentMetricsSchema>;
