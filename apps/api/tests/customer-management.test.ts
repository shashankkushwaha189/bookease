import { CustomerManagementEngine } from '../src/modules/customer/customer.engine';
import { 
  CustomerStatus,
  CustomerNoteType,
  ConsentType
} from '../src/modules/customer/customer.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  customer: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  customerNote: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  customerTag: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  consentRecord: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Phase 10 - Customer Management', () => {
  let engine: CustomerManagementEngine;

  beforeEach(() => {
    engine = new CustomerManagementEngine();
    vi.clearAllMocks();
  });

  describe('Customer Profile', () => {
    it('should create customer profile', async () => {
      const customerData = {
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        status: CustomerStatus.ACTIVE,
      };

      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'customer-123',
        ...customerData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await engine.createCustomer(customerData);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          status: CustomerStatus.ACTIVE,
        }),
      });
    });

    it('should prevent duplicate email creation', async () => {
      const customerData = {
        tenantId: 'tenant-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'existing-customer',
        email: 'john.doe@example.com',
      });

      await expect(engine.createCustomer(customerData)).rejects.toThrow(
        'Customer with this email already exists'
      );
    });
  });

  describe('Customer Notes', () => {
    it('should store notes correctly', async () => {
      const customerId = 'customer-123';
      const staffId = 'staff-123';
      const noteData = {
        type: CustomerNoteType.GENERAL,
        title: 'Test Note',
        content: 'This is a test note content',
        isPrivate: false,
        isImportant: true,
        tags: ['important', 'follow-up'],
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        name: 'John Doe',
      });

      mockPrisma.customerNote.create.mockResolvedValue({
        id: 'note-123',
        customerId,
        staffId,
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await engine.addCustomerNote(customerId, staffId, noteData);

      expect(result.title).toBe('Test Note');
      expect(result.content).toBe('This is a test note content');
      expect(result.isImportant).toBe(true);
      expect(result.tags).toEqual(['important', 'follow-up']);
    });

    it('should allow private notes', async () => {
      const customerId = 'customer-123';
      const staffId = 'staff-123';
      const noteData = {
        type: CustomerNoteType.MEDICAL,
        title: 'Medical Information',
        content: 'Patient has allergy to peanuts',
        isPrivate: true,
        isImportant: true,
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        name: 'John Doe',
      });

      mockPrisma.customerNote.create.mockResolvedValue({
        id: 'note-123',
        customerId,
        staffId,
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await engine.addCustomerNote(customerId, staffId, noteData);

      expect(result.isPrivate).toBe(true);
      expect(result.type).toBe(CustomerNoteType.MEDICAL);
    });
  });

  describe('Appointment History', () => {
    it('should show accurate customer history', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const customer = {
        id: customerId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        totalVisits: 5,
        lastVisitDate: new Date('2024-01-15'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const appointments = [
        {
          id: 'apt-1',
          customerId,
          staffId: 'staff-1',
          serviceId: 'service-1',
          startTimeUtc: new Date('2024-01-15'),
          endTimeUtc: new Date('2024-01-15'),
          status: 'COMPLETED',
          referenceId: 'BK-123',
          notes: 'Great session',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'apt-2',
          customerId,
          staffId: 'staff-2',
          serviceId: 'service-2',
          startTimeUtc: new Date('2024-01-08'),
          endTimeUtc: new Date('2024-01-08'),
          status: 'COMPLETED',
          referenceId: 'BK-124',
          createdAt: new Date('2024-01-08'),
        },
      ];

      mockPrisma.customer.findFirst.mockResolvedValue(customer);
      mockPrisma.appointment.findMany.mockResolvedValue(appointments);

      const result = await engine.getCustomerProfile(customerId, tenantId);

      expect(result.totalVisits).toBe(5);
      expect(result.lastVisitDate).toBe('2024-01-15T00:00:00.000Z');
      
      if (result.appointmentHistory) {
        expect(result.appointmentHistory).toHaveLength(2);
        expect(result.appointmentHistory[0].referenceId).toBe('BK-123');
        expect(result.appointmentHistory[1].referenceId).toBe('BK-124');
      }
    });
  });

  describe('Consent Records', () => {
    it('should capture consent correctly', async () => {
      const customerId = 'customer-123';
      const consentData = {
        type: ConsentType.PRIVACY_POLICY,
        version: 'v2.0',
        given: true,
        givenAt: '2024-01-01T10:00:00Z',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        documentUrl: 'https://example.com/privacy',
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        name: 'John Doe',
      });

      mockPrisma.consentRecord.create.mockResolvedValue({
        id: 'consent-123',
        customerId,
        ...consentData,
        createdAt: new Date(),
      });

      mockPrisma.customer.update.mockResolvedValue({
        id: customerId,
        consentGiven: true,
        consentDate: new Date('2024-01-01T10:00:00Z'),
      });

      const result = await engine.recordConsent(customerId, consentData);

      expect(result.type).toBe(ConsentType.PRIVACY_POLICY);
      expect(result.version).toBe('v2.0');
      expect(result.given).toBe(true);
      expect(result.ipAddress).toBe('192.168.1.1');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          consentGiven: true,
          consentDate: new Date('2024-01-01T10:00:00Z'),
        },
      });
    });

    it('should track consent withdrawal', async () => {
      const customerId = 'customer-123';
      const consentData = {
        type: ConsentType.MARKETING_COMMUNICATIONS,
        version: 'v1.0',
        given: false,
        givenAt: '2024-01-01T10:00:00Z',
        withdrawnAt: '2024-02-01T10:00:00Z',
        withdrawnBy: 'customer-123',
        notes: 'Customer withdrew consent',
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: customerId,
        name: 'John Doe',
      });

      mockPrisma.consentRecord.create.mockResolvedValue({
        id: 'consent-123',
        customerId,
        ...consentData,
        createdAt: new Date(),
      });

      const result = await engine.recordConsent(customerId, consentData);

      expect(result.given).toBe(false);
      expect(result.withdrawnAt).toBe('2024-02-01T10:00:00Z');
      expect(result.notes).toBe('Customer withdrew consent');
    });
  });

  describe('Performance Requirements', () => {
    it('should fetch profile in under 200ms', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const customer = {
        id: customerId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.customer.findFirst.mockResolvedValue(customer);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const startTime = Date.now();
      await engine.getCustomerProfile(customerId, tenantId);
      const endTime = Date.now();

      const fetchTime = endTime - startTime;
      expect(fetchTime).toBeLessThan(200); // Less than 200ms
    });
  });

  describe('Soft Delete Safety', () => {
    it('should prevent deletion with upcoming appointments', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const customer = {
        id: customerId,
        name: 'John Doe',
        status: CustomerStatus.ACTIVE,
        deletedAt: null,
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        ...customer,
        _count: {
          appointments: 2, // Has upcoming appointments
        },
      });

      await expect(engine.softDeleteCustomer(customerId, tenantId)).rejects.toThrow(
        'Cannot delete customer with upcoming appointments'
      );
    });

    it('should allow soft delete when safe', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const customer = {
        id: customerId,
        name: 'John Doe',
        status: CustomerStatus.ACTIVE,
        deletedAt: null,
      };

      mockPrisma.customer.findFirst.mockResolvedValue({
        ...customer,
        _count: {
          appointments: 0, // No upcoming appointments
        },
      });

      mockPrisma.customer.update.mockResolvedValue({
        ...customer,
        status: CustomerStatus.DELETED,
        deletedAt: new Date(),
      });

      await engine.softDeleteCustomer(customerId, tenantId, 'Customer requested deletion');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          status: CustomerStatus.DELETED,
          deletedAt: expect.any(Date),
          notes: expect.any(String),
          updatedAt: expect.any(Date),
        },
      });

      const metrics = engine.getMetrics();
      expect(metrics.softDeleteOperations).toBe(1);
    });
  });

  describe('Customer Search and Filtering', () => {
    it('should search customers by name', async () => {
      const query = {
        tenantId: 'tenant-123',
        search: 'John',
        limit: 20,
        offset: 0,
      };

      const customers = [
        {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          status: CustomerStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'customer-2',
          name: 'John Smith',
          email: 'smith@example.com',
          status: CustomerStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.customer.findMany.mockResolvedValue(customers);
      mockPrisma.customer.count.mockResolvedValue(2);

      const result = await engine.searchCustomers(query);

      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.customers[0].name).toBe('John Doe');
      expect(result.customers[1].name).toBe('John Smith');
    });

    it('should filter by status', async () => {
      const query = {
        tenantId: 'tenant-123',
        status: CustomerStatus.ACTIVE,
        limit: 10,
        offset: 0,
      };

      const customers = [
        {
          id: 'customer-1',
          name: 'Active Customer',
          status: CustomerStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.customer.findMany.mockResolvedValue(customers);
      mockPrisma.customer.count.mockResolvedValue(1);

      const result = await engine.searchCustomers(query);

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].status).toBe(CustomerStatus.ACTIVE);
    });
  });

  describe('Customer Statistics', () => {
    it('should calculate customer statistics', async () => {
      const tenantId = 'tenant-123';

      mockPrisma.customer.count
        .mockResolvedValueOnce(100) // totalCustomers
        .mockResolvedValueOnce(80)  // activeCustomers
        .mockResolvedValueOnce(10)  // newCustomersThisMonth
        .mockResolvedValueOnce(60)  // customersWithVisitsThisMonth;

      mockPrisma.customer.aggregate.mockResolvedValue({
        _avg: {
          totalVisits: 5.5,
          totalSpent: 250.75,
        },
      });

      mockPrisma.customer.findMany
        .mockResolvedValueOnce([
          { tags: ['VIP', 'Regular'] },
          { tags: ['VIP'] },
          { tags: ['New'] },
        ])
        .mockResolvedValueOnce([
          { source: 'WEBSITE' },
          { source: 'PHONE' },
          { source: 'REFERRAL' },
        ]);

      const stats = await engine.getCustomerStatistics(tenantId);

      expect(stats.totalCustomers).toBe(100);
      expect(stats.activeCustomers).toBe(80);
      expect(stats.newCustomersThisMonth).toBe(10);
      expect(stats.customersWithVisitsThisMonth).toBe(60);
      expect(stats.averageVisitsPerCustomer).toBe(5.5);
      expect(stats.averageSpentPerCustomer).toBe(250.75);
    });
  });

  describe('Customer Tags', () => {
    it('should create and manage customer tags', async () => {
      const tenantId = 'tenant-123';
      const tagData = {
        name: 'VIP',
        color: '#FF5722',
        description: 'Very important customers',
      };

      mockPrisma.customerTag.findFirst.mockResolvedValue(null);
      mockPrisma.customerTag.create.mockResolvedValue({
        id: 'tag-123',
        tenantId,
        ...tagData,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await engine.upsertCustomerTag(tenantId, tagData);

      expect(result.name).toBe('VIP');
      expect(result.color).toBe('#FF5722');
      expect(result.description).toBe('Very important customers');
      expect(result.usageCount).toBe(0);
      expect(result.isActive).toBe(true);
    });

    it('should update existing tag', async () => {
      const tenantId = 'tenant-123';
      const tagData = {
        name: 'VIP',
        color: '#FF5722',
        description: 'Updated description',
      };

      const existingTag = {
        id: 'tag-123',
        tenantId,
        name: 'VIP',
        color: '#FF0000',
        description: 'Original description',
        usageCount: 5,
        isActive: true,
      };

      mockPrisma.customerTag.findFirst.mockResolvedValue(existingTag);
      mockPrisma.customerTag.update.mockResolvedValue({
        ...existingTag,
        description: 'Updated description',
        color: '#FF5722',
        updatedAt: new Date(),
      });

      const result = await engine.upsertCustomerTag(tenantId, tagData);

      expect(result.description).toBe('Updated description');
      expect(result.color).toBe('#FF5722');
      expect(mockPrisma.customerTag.update).toHaveBeenCalled();
    });
  });
});
