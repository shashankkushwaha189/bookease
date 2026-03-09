import { PolicyEngine } from '../src/modules/policy/policy.engine';
import { 
  PolicyType, 
  PolicyAction, 
  OverrideReason 
} from '../src/modules/policy/policy.schema';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Prisma for testing
const mockPrisma = {
  policyRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  policyOverride: {
    create: vi.fn(),
  },
  policyRuleArchive: {
    create: vi.fn(),
  },
  appointment: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock the prisma import
vi.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Phase 8 - Policy Engine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
    vi.clearAllMocks();
  });

  describe('Cancellation Window Policy', () => {
    it('should allow cancellation outside window', async () => {
      const request = {
        action: 'CANCEL' as const,
        staffId: 'staff-123',
        serviceId: 'service-123',
        customerId: 'customer-123',
        appointmentTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
        userId: 'user-123',
        userRole: 'CUSTOMER' as const,
      };

      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: 'policy-123',
          type: PolicyType.CANCELLATION_WINDOW,
          name: 'Cancellation Policy',
          priority: 50,
          config: { hoursBeforeAppointment: 24, allowAdminOverride: true },
          conditions: null,
        },
      ]);

      const result = await engine.evaluatePolicy(request);

      expect(result.action).toBe('ALLOW');
      expect(result.policies[0].action).toBe('ALLOW');
    });

    it('should block cancellation inside allowed window', async () => {
      const request = {
        action: 'CANCEL' as const,
        staffId: 'staff-123',
        serviceId: 'service-123',
        customerId: 'customer-123',
        appointmentTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        userId: 'user-123',
        userRole: 'CUSTOMER' as const,
      };

      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: 'policy-123',
          type: PolicyType.CANCELLATION_WINDOW,
          name: 'Cancellation Policy',
          priority: 50,
          config: { hoursBeforeAppointment: 24, allowAdminOverride: true },
          conditions: null,
        },
      ]);

      const result = await engine.evaluatePolicy(request);

      expect(result.action).toBe('BLOCK');
      expect(result.policies[0].message).toContain('not allowed within 24 hours');
    });
  });

  describe('Reschedule Limit Policy', () => {
    it('should enforce reschedule limit', async () => {
      const request = {
        action: 'RESCHEDULE' as const,
        staffId: 'staff-123',
        serviceId: 'service-123',
        customerId: 'customer-123',
        appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        requestedTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        userId: 'user-123',
        userRole: 'CUSTOMER' as const,
      };

      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: 'policy-123',
          type: PolicyType.RESCHEDULE_LIMIT,
          name: 'Reschedule Policy',
          priority: 50,
          config: { maxReschedules: 3, timeWindowHours: 168, allowAdminOverride: true },
          conditions: null,
        },
      ]);

      mockPrisma.appointment.count.mockResolvedValue(3); // At limit

      const result = await engine.evaluatePolicy(request);

      expect(result.action).toBe('BLOCK');
      expect(result.policies[0].message).toContain('limit of 3 per 168 hours exceeded');
    });
  });

  describe('Admin Override', () => {
    it('should log override with reason', async () => {
      const override = {
        policyEvaluationId: 'eval-123',
        reason: OverrideReason.CUSTOMER_REQUEST,
        reasonText: 'Customer needs to reschedule due to emergency',
        userId: 'admin-123',
        userRole: 'ADMIN' as const,
      };

      mockPrisma.policyOverride.create.mockResolvedValue({ id: 'override-123' });

      await engine.overridePolicy(override);

      expect(mockPrisma.policyOverride.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          policyEvaluationId: 'eval-123',
          reason: 'CUSTOMER_REQUEST',
          reasonText: 'Customer needs to reschedule due to emergency',
          userId: 'admin-123',
          userRole: 'ADMIN',
        }),
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should enforce policy in under 200ms', async () => {
      const request = {
        action: 'CANCEL' as const,
        staffId: 'staff-123',
        serviceId: 'service-123',
        customerId: 'customer-123',
        appointmentTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        userId: 'user-123',
        userRole: 'CUSTOMER' as const,
      };

      mockPrisma.policyRule.findMany.mockResolvedValue([
        {
          id: 'policy-1',
          type: PolicyType.CANCELLATION_WINDOW,
          name: 'Cancellation Policy',
          priority: 50,
          config: { hoursBeforeAppointment: 24, allowAdminOverride: true },
          conditions: null,
        },
      ]);

      const startTime = Date.now();
      await engine.evaluatePolicy(request);
      const endTime = Date.now();

      const evaluationTime = endTime - startTime;
      expect(evaluationTime).toBeLessThan(200); // Less than 200ms
    });
  });

  describe('Policy Updates and Historical Data', () => {
    it('should preserve historical data when updating policies', async () => {
      const existingPolicy = {
        id: 'policy-123',
        type: PolicyType.CANCELLATION_WINDOW,
        name: 'Original Cancellation Policy',
        description: 'Original description',
        priority: 50,
        config: { hoursBeforeAppointment: 24, allowAdminOverride: true },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'user-123',
      };

      mockPrisma.policyRule.findUnique.mockResolvedValue(existingPolicy);
      mockPrisma.policyRuleArchive.create.mockResolvedValue({ id: 'archive-123' });
      mockPrisma.policyRule.update.mockResolvedValue({ id: 'policy-123', version: 2 });

      await engine.updatePolicy('policy-123', { 
        type: PolicyType.CANCELLATION_WINDOW,
        name: 'Updated Cancellation Policy',
        description: 'Updated description',
        priority: 60,
        config: { hoursBeforeAppointment: 48, allowAdminOverride: false },
        updatedBy: 'user-456' 
      });

      expect(mockPrisma.policyRuleArchive.create).toHaveBeenCalled();
      expect(mockPrisma.policyRule.update).toHaveBeenCalledWith({
        where: { id: 'policy-123' },
        data: expect.objectContaining({
          version: { increment: 1 },
        }),
      });
    });
  });
});
