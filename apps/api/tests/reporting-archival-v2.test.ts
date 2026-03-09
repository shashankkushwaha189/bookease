import { ReportingArchivalEngine } from '../src/modules/reporting/reporting.engine';
import { 
  ReportType,
  ExportFormat,
  TimePeriod
} from '../src/modules/reporting/reporting.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  appointmentArchive: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
  },
  archivalConfig: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  archivalJob: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Phase 11 - Reporting & Archival', () => {
  let engine: ReportingArchivalEngine;

  beforeEach(() => {
    engine = new ReportingArchivalEngine();
    vi.clearAllMocks();
  });

  describe('Reporting', () => {
    it('should generate appointments by service report', async () => {
      const query = {
        tenantId: 'tenant-123',
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        timePeriod: TimePeriod.MONTHLY,
        limit: 100,
        offset: 0,
      };

      const mockAppointments = [
        {
          id: 'apt-1',
          serviceId: 'service-1',
          status: 'COMPLETED',
          startTimeUtc: new Date('2024-01-15T10:00:00Z'),
          service: { name: 'Haircut' },
        },
        {
          id: 'apt-2',
          serviceId: 'service-1',
          status: 'CANCELLED',
          startTimeUtc: new Date('2024-01-16T14:00:00Z'),
          service: { name: 'Haircut' },
        },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await engine.generateReport(query);

      expect(result.reportType).toBe(ReportType.APPOINTMENTS_BY_SERVICE);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should generate no-show rate report', async () => {
      const query = {
        tenantId: 'tenant-123',
        reportType: ReportType.NO_SHOW_RATE,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        timePeriod: TimePeriod.MONTHLY,
        limit: 100,
        offset: 0,
      };

      const mockAppointments = [
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'NO_SHOW' },
        { status: 'CANCELLED' },
        { status: 'NO_SHOW' },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await engine.generateReport(query);

      expect(result.reportType).toBe(ReportType.NO_SHOW_RATE);
      const noShowData = result.data as any;
      expect(noShowData.totalAppointments).toBe(5);
      expect(noShowData.noShowCount).toBe(2);
      expect(noShowData.noShowRate).toBe(40);
    });

    it('should export data to CSV', async () => {
      const mockData = [
        { id: 1, name: 'Service A', appointments: 10, revenue: 500 },
        { id: 2, name: 'Service B', appointments: 5, revenue: 250 },
      ];

      const exportRequest = {
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        format: ExportFormat.CSV,
        data: mockData,
        includeHeaders: true,
      };

      const result = await engine.exportReport(exportRequest);

      expect(result.filename).toContain('.csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('id,name,appointments,revenue');
    });
  });

  describe('Archival', () => {
    it('should configure archival settings', async () => {
      const config = {
        tenantId: 'tenant-123',
        archiveAfterMonths: 6,
        archiveStatuses: ['COMPLETED'],
        excludeRecentDays: 30,
        batchSize: 100,
        enabled: true,
      };

      mockPrisma.archivalConfig.findFirst.mockResolvedValue(null);
      mockPrisma.archivalConfig.create.mockResolvedValue({ id: 'config-123' });

      await engine.configureArchival(config);

      expect(mockPrisma.archivalConfig.create).toHaveBeenCalledWith({
        data: config,
      });
    });

    it('should hide archived appointments by default', async () => {
      const query = {
        tenantId: 'tenant-123',
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        timePeriod: TimePeriod.MONTHLY,
        includeArchived: false,
        limit: 100,
        offset: 0,
      };

      mockPrisma.appointment.findMany.mockResolvedValue([]);

      await engine.generateReport(query);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it('should make archive searchable', async () => {
      const search = {
        tenantId: 'tenant-123',
        query: 'John',
        limit: 50,
        offset: 0,
      };

      const mockArchivedAppointments = [
        {
          id: 'arch-1',
          originalId: 'apt-1',
          customerName: 'John Doe',
          archivedAt: new Date('2024-07-01T00:00:00Z'),
        },
      ];

      mockPrisma.appointmentArchive.findMany.mockResolvedValue(mockArchivedAppointments);
      mockPrisma.appointmentArchive.count.mockResolvedValue(1);

      const result = await engine.searchArchivedAppointments(search);

      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0].customerName).toBe('John Doe');
      expect(result.total).toBe(1);
    });
  });

  describe('Performance Requirements', () => {
    it('should generate reports in under 2 seconds', async () => {
      const query = {
        tenantId: 'tenant-123',
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        timePeriod: TimePeriod.MONTHLY,
        limit: 1000,
        offset: 0,
      };

      const mockAppointments = Array.from({ length: 1000 }, (_, i) => ({
        id: `apt-${i}`,
        serviceId: `service-${i % 10}`,
        status: 'COMPLETED',
        startTimeUtc: new Date(`2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`),
        service: { name: `Service ${i % 10}` },
      }));

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const startTime = Date.now();
      await engine.generateReport(query);
      const endTime = Date.now();

      const generationTime = endTime - startTime;
      expect(generationTime).toBeLessThan(2000);
    });
  });

  describe('Functional Requirements', () => {
    it('should ensure aggregation is accurate', async () => {
      const query = {
        tenantId: 'tenant-123',
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        timePeriod: TimePeriod.MONTHLY,
        limit: 100,
        offset: 0,
      };

      const mockAppointments = [
        { serviceId: 'service-1', status: 'COMPLETED' },
        { serviceId: 'service-1', status: 'COMPLETED' },
        { serviceId: 'service-1', status: 'CANCELLED' },
        { serviceId: 'service-2', status: 'COMPLETED' },
        { serviceId: 'service-2', status: 'NO_SHOW' },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await engine.generateReport(query);

      const serviceData = result.data as any[];
      const service1 = serviceData.find(s => s.serviceId === 'service-1');
      const service2 = serviceData.find(s => s.serviceId === 'service-2');

      expect(service1.totalAppointments).toBe(3);
      expect(service1.completedAppointments).toBe(2);
      expect(service1.cancelledAppointments).toBe(1);

      expect(service2.totalAppointments).toBe(2);
      expect(service2.completedAppointments).toBe(1);
      expect(service2.noShowAppointments).toBe(1);
    });

    it('should ensure CSV matches data', async () => {
      const mockData = [
        { serviceId: 'service-1', serviceName: 'Haircut', totalAppointments: 10, revenue: 500 },
        { serviceId: 'service-2', serviceName: 'Massage', totalAppointments: 5, revenue: 250 },
      ];

      const exportRequest = {
        reportType: ReportType.APPOINTMENTS_BY_SERVICE,
        format: ExportFormat.CSV,
        data: mockData,
        includeHeaders: true,
      };

      const result = await engine.exportReport(exportRequest);

      const lines = result.data.split('\n');
      const headers = lines[0].split(',');
      const row1 = lines[1].split(',');

      expect(headers[0]).toBe('serviceId');
      expect(headers[1]).toBe('serviceName');
      expect(row1[0]).toBe('service-1');
      expect(row1[1]).toBe('Haircut');
    });
  });
});
