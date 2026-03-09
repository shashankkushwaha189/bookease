import { AppointmentTimelineEngine } from '../src/modules/appointment-timeline/timeline.engine';
import { 
  TimelineEventType, 
  AuditAction, 
  AuditUserRole 
} from '../src/modules/appointment-timeline/timeline.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  timelineEvent: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  aiUsageTracking: {
    create: vi.fn(),
  },
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Phase 9 - Appointment Timeline & Audit', () => {
  let engine: AppointmentTimelineEngine;

  beforeEach(() => {
    engine = new AppointmentTimelineEngine();
    vi.clearAllMocks();
  });

  describe('Timeline Events', () => {
    it('should log every status change', async () => {
      const appointmentId = 'apt-123';
      const userId = 'user-123';
      const userRole = AuditUserRole.CUSTOMER;

      mockPrisma.timelineEvent.findFirst.mockResolvedValue(null);
      mockPrisma.timelineEvent.create.mockResolvedValue({ id: 'event-123' });

      const eventTypes = [
        TimelineEventType.CREATED,
        TimelineEventType.RESCHEDULED,
        TimelineEventType.CANCELLED,
        TimelineEventType.COMPLETED,
        TimelineEventType.NO_SHOW,
        TimelineEventType.AI_SUMMARY_GENERATED,
      ];

      for (const eventType of eventTypes) {
        await engine.addTimelineEvent(appointmentId, eventType, userId, userRole);
      }

      expect(mockPrisma.timelineEvent.create).toHaveBeenCalledTimes(6);
    });

    it('should ensure events are in correct order', async () => {
      const appointmentId = 'apt-123';
      const events = [
        { id: '1', eventType: TimelineEventType.CREATED, timestamp: new Date('2024-01-01T10:00:00Z') },
        { id: '2', eventType: TimelineEventType.COMPLETED, timestamp: new Date('2024-01-01T11:00:00Z') },
      ];

      mockPrisma.timelineEvent.findMany.mockResolvedValue(events);
      mockPrisma.timelineEvent.count.mockResolvedValue(2);
      mockPrisma.timelineEvent.groupBy.mockResolvedValue([]);
      mockPrisma.timelineEvent.aggregate.mockResolvedValue({
        _min: { timestamp: new Date('2024-01-01T10:00:00Z') },
        _max: { timestamp: new Date('2024-01-01T11:00:00Z') },
      });

      const result = await engine.getTimeline({ appointmentId, limit: 50, offset: 0 });

      expect(result.events[0].eventType).toBe(TimelineEventType.COMPLETED);
      expect(result.events[1].eventType).toBe(TimelineEventType.CREATED);
    });

    it('should ensure timeline is immutable', async () => {
      const appointmentId = 'apt-123';
      const userId = 'user-123';
      const userRole = AuditUserRole.CUSTOMER;

      mockPrisma.timelineEvent.findFirst.mockResolvedValue({
        id: 'existing-event',
        eventType: TimelineEventType.CREATED,
        timestamp: new Date(),
      });

      await engine.addTimelineEvent(appointmentId, TimelineEventType.CREATED, userId, userRole);

      expect(mockPrisma.timelineEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should log who did what and when', async () => {
      const entityType = 'appointment';
      const entityId = 'apt-123';
      const userId = 'user-123';
      const userRole = AuditUserRole.STAFF;

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await engine.addAuditLog(AuditAction.CREATE, entityType, entityId, userId, userRole, { test: 'data' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          resourceType: entityType,
          resourceId: entityId,
          userId,
          userRole,
          details: { test: 'data' },
          success: true,
        }),
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should fetch timeline in under 200ms', async () => {
      const appointmentId = 'apt-123';

      mockPrisma.timelineEvent.findMany.mockResolvedValue([{ id: '1', eventType: TimelineEventType.CREATED }]);
      mockPrisma.timelineEvent.count.mockResolvedValue(1);
      mockPrisma.timelineEvent.groupBy.mockResolvedValue([]);
      mockPrisma.timelineEvent.aggregate.mockResolvedValue({
        _min: { timestamp: new Date() },
        _max: { timestamp: new Date() },
      });

      const startTime = Date.now();
      await engine.getTimeline({ appointmentId, limit: 50, offset: 0 });
      const endTime = Date.now();

      const fetchTime = endTime - startTime;
      expect(fetchTime).toBeLessThan(200);
    });

    it('should ensure async logging does not block requests', async () => {
      const appointmentId = 'apt-123';
      const userId = 'user-123';
      const userRole = AuditUserRole.CUSTOMER;

      mockPrisma.timelineEvent.findFirst.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return null;
      });
      mockPrisma.timelineEvent.create.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 'event-123' };
      });

      const startTime = Date.now();
      await engine.addTimelineEvent(appointmentId, TimelineEventType.CREATED, userId, userRole);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(50);
    });
  });

  describe('Correlation ID Tracking', () => {
    it('should create correlation context for each request', () => {
      const userId = 'user-123';
      const userRole = AuditUserRole.CUSTOMER;

      const context = engine.createCorrelationContext(userId, userRole, {
        sessionId: 'session-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
      });

      expect(context.correlationId).toBeDefined();
      expect(context.userId).toBe(userId);
      expect(context.userRole).toBe(userRole);
      expect(context.sessionId).toBe('session-123');
      expect(context.ipAddress).toBe('192.168.1.1');
      expect(context.userAgent).toBe('Mozilla/5.0');
      expect(context.requestId).toBe('req-123');
    });
  });
});
