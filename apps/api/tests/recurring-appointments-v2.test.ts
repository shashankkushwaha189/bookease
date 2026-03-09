import { RecurringAppointmentEngine } from '../src/modules/appointment/recurring.engine';
import { 
  RecurrencePattern, 
  DayOfWeek, 
  MonthlyRecurrenceType,
  SeriesStatus 
} from '../src/modules/appointment/recurring.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  recurringSeries: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  appointment: {
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
  staff: {
    findUnique: vi.fn(),
  },
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Phase 7 - Recurring Appointments', () => {
  let engine: RecurringAppointmentEngine;

  beforeEach(() => {
    engine = new RecurringAppointmentEngine();
    vi.clearAllMocks();
  });

  describe('Weekly Recurrence', () => {
    it('should generate correct weekly recurring dates', async () => {
      const recurrenceRule = {
        pattern: RecurrencePattern.WEEKLY,
        interval: 1,
        daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
        startDate: '2024-01-01T00:00:00Z',
        maxOccurrences: 6,
      };

      const occurrences = await engine.generateRecurrenceDates({
        recurrenceRule,
        baseStartTime: '2024-01-01T09:00:00Z',
        baseEndTime: '2024-01-01T10:00:00Z',
        maxOccurrences: 6,
      });

      expect(occurrences).toHaveLength(6);
      expect(occurrences[0].startTime).toBe('2024-01-01T09:00:00Z'); // Monday
      expect(occurrences[1].startTime).toBe('2024-01-03T09:00:00Z'); // Wednesday
      expect(occurrences[2].startTime).toBe('2024-01-05T09:00:00Z'); // Friday
      expect(occurrences[3].startTime).toBe('2024-01-08T09:00:00Z'); // Next Monday
    });

    it('should handle bi-weekly recurrence', async () => {
      const recurrenceRule = {
        pattern: RecurrencePattern.BI_WEEKLY,
        interval: 1,
        daysOfWeek: [DayOfWeek.TUESDAY],
        startDate: '2024-01-02T00:00:00Z',
        maxOccurrences: 3,
      };

      const occurrences = await engine.generateRecurrenceDates({
        recurrenceRule,
        baseStartTime: '2024-01-02T14:00:00Z',
        baseEndTime: '2024-01-02T15:00:00Z',
        maxOccurrences: 3,
      });

      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].startTime).toBe('2024-01-02T14:00:00Z'); // First Tuesday
      expect(occurrences[1].startTime).toBe('2024-01-16T14:00:00Z'); // Two weeks later
      expect(occurrences[2].startTime).toBe('2024-01-30T14:00:00Z'); // Four weeks later
    });
  });

  describe('Monthly Recurrence', () => {
    it('should generate day-of-month recurrence', async () => {
      const recurrenceRule = {
        pattern: RecurrencePattern.MONTHLY,
        interval: 1,
        daysOfWeek: [],
        monthlyType: MonthlyRecurrenceType.DAY_OF_MONTH,
        dayOfMonth: 15,
        startDate: '2024-01-01T00:00:00Z',
        maxOccurrences: 4,
      };

      const occurrences = await engine.generateRecurrenceDates({
        recurrenceRule,
        baseStartTime: '2024-01-15T10:00:00Z',
        baseEndTime: '2024-01-15T11:00:00Z',
        maxOccurrences: 4,
      });

      expect(occurrences).toHaveLength(4);
      expect(occurrences[0].startTime).toBe('2024-01-15T10:00:00Z');
      expect(occurrences[1].startTime).toBe('2024-02-15T10:00:00Z');
      expect(occurrences[2].startTime).toBe('2024-03-15T10:00:00Z');
      expect(occurrences[3].startTime).toBe('2024-04-15T10:00:00Z');
    });

    it('should handle day-of-week recurrence', async () => {
      const recurrenceRule = {
        pattern: RecurrencePattern.MONTHLY,
        interval: 1,
        daysOfWeek: [DayOfWeek.THURSDAY],
        monthlyType: MonthlyRecurrenceType.DAY_OF_WEEK,
        weekOfMonth: 2, // Second Thursday
        startDate: '2024-01-01T00:00:00Z',
        maxOccurrences: 3,
      };

      const occurrences = await engine.generateRecurrenceDates({
        recurrenceRule,
        baseStartTime: '2024-01-11T13:00:00Z',
        baseEndTime: '2024-01-11T14:00:00Z',
        maxOccurrences: 3,
      });

      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].startTime).toBe('2024-01-11T13:00:00Z'); // Second Thursday of January
      expect(occurrences[1].startTime).toBe('2024-02-08T13:00:00Z'); // Second Thursday of February
      expect(occurrences[2].startTime).toBe('2024-03-14T13:00:00Z'); // Second Thursday of March
    });
  });

  describe('Performance Requirements', () => {
    it('should generate recurrence in under 1 second', async () => {
      const startTime = Date.now();
      
      const recurrenceRule = {
        pattern: RecurrencePattern.WEEKLY,
        interval: 1,
        daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
        startDate: '2024-01-01T00:00:00Z',
        maxOccurrences: 52, // One year of occurrences
      };

      await engine.generateRecurrenceDates({
        recurrenceRule,
        baseStartTime: '2024-01-01T09:00:00Z',
        baseEndTime: '2024-01-01T10:00:00Z',
        maxOccurrences: 52,
      });

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      expect(generationTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should prevent exponential DB writes', async () => {
      const seriesData = {
        title: 'Test Series',
        staffId: 'staff-123',
        serviceId: 'service-123',
        customerId: 'customer-123',
        startTimeUtc: '2024-01-01T09:00:00Z',
        endTimeUtc: '2024-01-01T10:00:00Z',
        recurrenceRule: {
          pattern: RecurrencePattern.WEEKLY,
          interval: 1,
          daysOfWeek: [DayOfWeek.MONDAY],
          startDate: '2024-01-01T00:00:00Z',
          maxOccurrences: 100, // Large number
        },
        createdBy: 'user-123',
      };

      mockPrisma.staff.findUnique.mockResolvedValue({ tenantId: 'tenant-123' });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrisma);
      });
      mockPrisma.recurringSeries.create.mockResolvedValue({
        id: 'series-123',
        ...seriesData,
        status: SeriesStatus.ACTIVE,
        totalOccurrences: 100,
      });
      mockPrisma.appointment.create.mockResolvedValue({ id: 'apt-123' });

      await engine.createRecurringSeries(seriesData);

      // Should only create first 10 appointments, not all 100
      expect(mockPrisma.appointment.create).toHaveBeenCalledTimes(10);
    });
  });

  describe('Cancel Single vs Entire Series', () => {
    it('should cancel single appointment', async () => {
      const cancelData = {
        appointmentId: 'apt-123',
        cancelMode: 'SINGLE' as const,
        cancelledBy: 'user-123',
        reason: 'Customer request',
      };

      mockPrisma.appointment.update.mockResolvedValue({ id: 'apt-123' });
      mockPrisma.appointment.findUnique.mockResolvedValue({ seriesId: 'series-123' });
      mockPrisma.recurringSeries.update.mockResolvedValue({ id: 'series-123' });

      await engine.cancelRecurringAppointment(cancelData);

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'apt-123' },
        data: {
          status: 'CANCELLED',
          updatedAt: expect.any(Date),
          notes: 'Customer request',
        },
      });
    });

    it('should cancel entire series', async () => {
      const cancelData = {
        appointmentId: 'apt-123',
        cancelMode: 'ENTIRE_SERIES' as const,
        cancelledBy: 'user-123',
        reason: 'Service discontinued',
      };

      mockPrisma.appointment.findUnique.mockResolvedValue({ seriesId: 'series-123' });
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 10 });
      mockPrisma.recurringSeries.update.mockResolvedValue({ id: 'series-123' });

      await engine.cancelRecurringAppointment(cancelData);

      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
        where: {
          seriesId: 'series-123',
          status: { not: 'CANCELLED' },
        },
        data: {
          status: 'CANCELLED',
          updatedAt: expect.any(Date),
          notes: 'Service discontinued',
        },
      });
      expect(mockPrisma.recurringSeries.update).toHaveBeenCalledWith({
        where: { id: 'series-123' },
        data: {
          status: SeriesStatus.CANCELLED,
          cancelledOccurrences: 10,
        },
      });
    });
  });
});
