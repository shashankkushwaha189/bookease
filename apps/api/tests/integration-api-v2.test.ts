import { IntegrationEngine } from '../src/modules/integration/integration.engine';
import { 
  ImportType,
  ImportStatus,
  RowValidationStatus,
  ApiTokenType,
  RateLimitTier
} from '../src/modules/integration/integration.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  importJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  customer: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  service: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  staff: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  apiToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  appointment: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock validator
vi.mock('validator', () => ({
  validate: vi.fn(),
  isEmail: vi.fn(() => true),
  isNumeric: vi.fn(() => true),
  isMobilePhone: vi.fn(() => true),
}));

describe('Phase 12 - Integration & API Layer', () => {
  let engine: IntegrationEngine;

  beforeEach(() => {
    engine = new IntegrationEngine();
    vi.clearAllMocks();
  });

  describe('CSV Import', () => {
    it('should create import job', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        importType: ImportType.CUSTOMERS,
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRows: 100,
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 100,
        },
      };

      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-123',
        ...jobData,
        status: ImportStatus.PENDING,
        startedAt: new Date(),
      });

      const result = await engine.createImportJob(jobData);

      expect(result.jobId).toBe('job-123');
      expect(result.importType).toBe(ImportType.CUSTOMERS);
      expect(result.status).toBe(ImportStatus.PENDING);
      expect(result.totalRows).toBe(100);
      expect(mockPrisma.importJob.create).toHaveBeenCalled();
    });

    it('should flag invalid CSV rows', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        importType: ImportType.CUSTOMERS,
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRows: 2,
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 100,
        },
      };

      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-123',
        ...jobData,
        status: ImportStatus.PENDING,
        startedAt: new Date(),
      });

      mockPrisma.importJob.update.mockResolvedValue({});

      const result = await engine.processImport('job-123', Buffer.from('name,email\n,missing-email\n'));

      expect(result.status).toBe(ImportStatus.FAILED);
      expect(result.failedRows).toBe(2);
      expect(result.successfulRows).toBe(0);
      expect(result.summary.errorRate).toBe(100);
    });

    it('should allow partial import with skip duplicates', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        importType: ImportType.CUSTOMERS,
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRows: 3,
        options: {
          skipDuplicates: true,
          updateExisting: false,
          validateOnly: false,
          batchSize: 100,
        },
      };

      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-123',
        ...jobData,
        status: ImportStatus.PENDING,
        startedAt: new Date(),
      });

      mockPrisma.importJob.update.mockResolvedValue({});

      mockPrisma.customer.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-customer' })
        .mockResolvedValueOnce(null);

      mockPrisma.customer.create.mockResolvedValue({ id: 'customer-1' });

      const result = await engine.processImport('job-123', Buffer.from('name,email\nJohn,john@example.com\nJane,jane@example.com\nJohn,john@example.com'));

      expect(result.status).toBe(ImportStatus.PARTIAL_SUCCESS);
      expect(result.successfulRows).toBe(2);
      expect(result.skippedRows).toBe(1);
      expect(result.duplicateRows).toBe(1);
    });
  });

  describe('API Token Management', () => {
    it('should create API token for tenant', async () => {
      const tokenData = {
        tenantId: 'tenant-123',
        name: 'Integration Token',
        tokenType: ApiTokenType.READ_WRITE,
        rateLimitTier: RateLimitTier.STANDARD,
        permissions: ['appointments:read', 'appointments:write'],
        expiresAt: '2024-12-31T23:59:59Z',
        allowedIps: ['192.168.1.1'],
        allowedOrigins: ['https://example.com'],
      };

      mockPrisma.apiToken.create.mockResolvedValue({
        id: 'token-123',
        name: tokenData.name,
        tokenHash: 'hashed-token',
        tokenType: tokenData.tokenType,
        rateLimitTier: tokenData.rateLimitTier,
        permissions: tokenData.permissions,
        expiresAt: new Date(tokenData.expiresAt),
        isActive: true,
        createdAt: new Date(),
      });

      const result = await engine.createApiToken(tokenData);

      expect(result.id).toBe('token-123');
      expect(result.name).toBe('Integration Token');
      expect(result.tokenType).toBe(ApiTokenType.READ_WRITE);
      expect(result.rateLimitTier).toBe(RateLimitTier.STANDARD);
      expect(result.token).toBeDefined();
      expect(mockPrisma.apiToken.create).toHaveBeenCalled();
    });

    it('should validate API token', async () => {
      const token = 'valid-api-token';
      const tenantId = 'tenant-123';

      mockPrisma.apiToken.findFirst.mockResolvedValue({
        id: 'token-123',
        tokenHash: 'hashed-token',
        isActive: true,
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      });

      mockPrisma.apiToken.update.mockResolvedValue({});

      const result = await engine.validateApiToken(token, tenantId);

      expect(result).not.toBeNull();
      expect(result?.isActive).toBe(true);
    });

    it('should reject invalid API token', async () => {
      const token = 'invalid-token';
      const tenantId = 'tenant-123';

      mockPrisma.apiToken.findFirst.mockResolvedValue(null);

      const result = await engine.validateApiToken(token, tenantId);

      expect(result).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      const request = {
        tenantId: 'tenant-123',
        tokenId: 'token-123',
        endpoint: '/api/appointments',
        ip: '192.168.1.1',
        userAgent: 'Test-Agent',
      };

      mockPrisma.apiToken.findUnique.mockResolvedValue({
        rateLimitTier: RateLimitTier.BASIC,
      });

      const result = await engine.checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.windowMs).toBe(60000);
    });

    it('should apply different limits for different tiers', async () => {
      const premiumRequest = {
        tenantId: 'tenant-123',
        tokenId: 'premium-token',
        endpoint: '/api/appointments',
      };

      const basicRequest = {
        tenantId: 'tenant-123',
        tokenId: 'basic-token',
        endpoint: '/api/appointments',
      };

      mockPrisma.apiToken.findUnique
        .mockResolvedValueOnce({ rateLimitTier: RateLimitTier.PREMIUM })
        .mockResolvedValueOnce({ rateLimitTier: RateLimitTier.BASIC });

      const premiumResult = await engine.checkRateLimit(premiumRequest);
      const basicResult = await engine.checkRateLimit(basicRequest);

      expect(premiumResult.limit).toBe(2000);
      expect(basicResult.limit).toBe(100);
    });
  });

  describe('Booking API', () => {
    it('should create booking via API', async () => {
      const bookingRequest = {
        tenantId: 'tenant-123',
        customerId: 'customer-123',
        serviceId: 'service-123',
        staffId: 'staff-123',
        startTimeUtc: '2024-01-15T10:00:00Z',
        notes: 'API booking',
        source: 'API',
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.service.findUnique.mockResolvedValue({ durationMinutes: 60 });
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'appointment-123',
        referenceId: 'BK-123456',
        status: 'CONFIRMED',
      });

      const result = await engine.createBooking(bookingRequest);

      expect(result.success).toBe(true);
      expect(result.appointmentId).toBe('appointment-123');
      expect(result.referenceId).toBe('BK-123456');
      expect(result.errors).toHaveLength(0);
      expect(result.bookingTime).toBeGreaterThan(0);
    });

    it('should reject booking for unavailable time slot', async () => {
      const bookingRequest = {
        tenantId: 'tenant-123',
        customerId: 'customer-123',
        serviceId: 'service-123',
        staffId: 'staff-123',
        startTimeUtc: '2024-01-15T10:00:00Z',
      };

      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'existing-appointment',
        status: 'CONFIRMED',
      });

      const result = await engine.createBooking(bookingRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Requested time slot is not available');
    });
  });

  describe('Performance Requirements', () => {
    it('should handle large CSV files safely', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        importType: ImportType.CUSTOMERS,
        fileName: 'large-customers.csv',
        fileSize: 10 * 1024 * 1024, // 10MB
        totalRows: 10000,
        options: {
          skipDuplicates: false,
          updateExisting: false,
          validateOnly: false,
          batchSize: 100,
        },
      };

      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-123',
        ...jobData,
        status: ImportStatus.PENDING,
        startedAt: new Date(),
      });

      mockPrisma.importJob.update.mockResolvedValue({});

      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'customer-1' });

      const startTime = Date.now();
      const result = await engine.processImport('job-123', Buffer.from('name,email\nTest,test@example.com'));
      const endTime = Date.now();

      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(result.summary.processingTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });

  describe('Functional Requirements', () => {
    it('should ensure API requires valid token', async () => {
      const token = 'invalid-token';
      const tenantId = 'tenant-123';

      mockPrisma.apiToken.findFirst.mockResolvedValue(null);

      const result = await engine.validateApiToken(token, tenantId);

      expect(result).toBeNull();
    });

    it('should ensure rate limiting enforced', async () => {
      const request = {
        tenantId: 'tenant-123',
        tokenId: 'token-123',
        endpoint: '/api/appointments',
      };

      mockPrisma.apiToken.findUnique.mockResolvedValue({
        rateLimitTier: RateLimitTier.BASIC,
      });

      const result = await engine.checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
    });
  });
});
