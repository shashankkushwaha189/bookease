import {
  PolicyType,
  PolicyAction,
  OverrideReason,
  PolicyRule,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyOverride,
  PolicyPreview,
  PolicyMetrics,
  policyRuleSchema,
  policyEvaluationRequestSchema,
  policyEvaluationResultSchema,
  policyOverrideSchema,
  policyPreviewSchema,
  policyMetricsSchema,
} from './policy.schema';
import { prisma } from '../../lib/prisma';

export class PolicyEngine {
  private metrics = {
    totalEvaluations: 0,
    blockedActions: 0,
    overriddenActions: 0,
    averageEvaluationTime: 0,
    policyViolations: new Map<string, { count: number; lastViolation: Date }>(),
    lastReset: new Date().toISOString(),
  };

  // Evaluate policy for a given action
  async evaluatePolicy(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    this.metrics.totalEvaluations++;

    try {
      // Validate request
      const validatedRequest = policyEvaluationRequestSchema.parse(request);

      // Get applicable policies
      const applicablePolicies = await this.getApplicablePolicies(validatedRequest);

      // Evaluate each policy
      const policyResults = [];
      let finalAction = PolicyAction.ALLOW;
      const warnings = [];
      let overrideRequired = false;

      for (const policy of applicablePolicies) {
        const result = await this.evaluateSinglePolicy(policy, validatedRequest);
        policyResults.push(result);

        // Determine the most restrictive action
        if (result.action === PolicyAction.BLOCK) {
          finalAction = PolicyAction.BLOCK;
        } else if (result.action === PolicyAction.REQUIRE_APPROVAL && finalAction !== PolicyAction.BLOCK) {
          finalAction = PolicyAction.REQUIRE_APPROVAL;
          overrideRequired = true;
        } else if (result.action === PolicyAction.WARN && finalAction === PolicyAction.ALLOW) {
          finalAction = PolicyAction.WARN;
          warnings.push(result.message);
        }

        // Track policy violations
        if (result.action === PolicyAction.BLOCK) {
          this.trackPolicyViolation(policy.id, policy.name);
        }
      }

      const evaluationTime = Date.now() - startTime;
      this.updateAverageEvaluationTime(evaluationTime);

      return {
        action: finalAction as any,
        message: this.generateResultMessage(finalAction, policyResults),
        policies: policyResults,
        overrideRequired,
        warnings,
        metadata: {
          evaluationTime,
          policiesEvaluated: applicablePolicies.length,
        },
      };

    } catch (error) {
      this.metrics.blockedActions++;
      throw error;
    }
  }

  // Override policy decision
  async overridePolicy(override: PolicyOverride): Promise<void> {
    const validatedOverride = policyOverrideSchema.parse(override);

    // Log the override
    await prisma.policyOverride.create({
      data: {
        policyEvaluationId: validatedOverride.policyEvaluationId,
        reason: validatedOverride.reason,
        reasonText: validatedOverride.reasonText,
        userId: validatedOverride.userId,
        userRole: validatedOverride.userRole,
        createdAt: new Date(),
      },
    });

    this.metrics.overriddenActions++;
  }

  // Preview policies for booking page
  async previewPolicies(preview: PolicyPreview): Promise<PolicyEvaluationResult> {
    const validatedPreview = policyPreviewSchema.parse(preview);

    const mockRequest: PolicyEvaluationRequest = {
      action: preview.action,
      staffId: preview.staffId,
      serviceId: preview.serviceId,
      customerId: preview.customerId,
      appointmentTime: preview.appointmentTime,
      userId: 'preview-user',
      userRole: 'CUSTOMER',
    };

    return this.evaluatePolicy(mockRequest);
  }

  // Create or update policy rule
  async createPolicy(policy: Omit<PolicyRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PolicyRule> {
    const validatedPolicy = policyRuleSchema.parse(policy);

    const createdPolicy = await prisma.policyRule.create({
      data: {
        ...validatedPolicy,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return createdPolicy as PolicyRule;
  }

  // Update existing policy
  async updatePolicy(id: string, updates: Partial<PolicyRule>): Promise<PolicyRule> {
    const validatedUpdates = policyRuleSchema.partial().parse(updates);

    // Create new version of policy to preserve historical data
    const existingPolicy = await prisma.policyRule.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      throw new Error('Policy not found');
    }

    // Archive old policy version
    await prisma.policyRuleArchive.create({
      data: {
        ...existingPolicy,
        archivedAt: new Date(),
        archivedBy: updates.updatedBy || existingPolicy.updatedBy,
      },
    });

    // Update policy with new version
    const updatedPolicy = await prisma.policyRule.update({
      where: { id },
      data: {
        ...validatedUpdates,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    return updatedPolicy as PolicyRule;
  }

  // Get policy metrics
  getMetrics(): PolicyMetrics {
    const violations = Array.from(this.metrics.policyViolations.entries()).map(([policyId, data]) => ({
      policyId,
      policyName: `Policy ${policyId}`, // Would be resolved from database
      violationCount: data.count,
      lastViolation: data.lastViolation.toISOString(),
    }));

    return {
      totalEvaluations: this.metrics.totalEvaluations,
      blockedActions: this.metrics.blockedActions,
      overriddenActions: this.metrics.overriddenActions,
      averageEvaluationTime: this.metrics.averageEvaluationTime,
      policyViolations: violations,
    };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      totalEvaluations: 0,
      blockedActions: 0,
      overriddenActions: 0,
      averageEvaluationTime: 0,
      policyViolations: new Map(),
      lastReset: new Date().toISOString(),
    };
  }

  // Private methods

  private async getApplicablePolicies(request: PolicyEvaluationRequest): Promise<PolicyRule[]> {
    // Get all active policies
    const allPolicies = await prisma.policyRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }, // Higher priority first
    });

    // Filter applicable policies based on conditions
    return allPolicies.filter(policy => {
      if (!policy.conditions) return true;

      const conditions = policy.conditions as any;
      
      // Check service conditions
      if (conditions.serviceIds && conditions.serviceIds.length > 0) {
        if (!conditions.serviceIds.includes(request.serviceId)) return false;
      }

      // Check staff conditions
      if (conditions.staffIds && conditions.staffIds.length > 0) {
        if (!conditions.staffIds.includes(request.staffId)) return false;
      }

      // Check time conditions
      if (conditions.timeRanges && conditions.timeRanges.length > 0) {
        const appointmentDate = new Date(request.appointmentTime);
        const dayOfWeek = appointmentDate.getDay();
        const hour = appointmentDate.getHours();

        const timeRangeMatch = conditions.timeRanges.some((range: any) => {
          const inDaysOfWeek = range.daysOfWeek.includes(dayOfWeek);
          const inHourRange = hour >= range.startHour && hour < range.endHour;
          return inDaysOfWeek && inHourRange;
        });

        if (!timeRangeMatch) return false;
      }

      return true;
    }) as PolicyRule[];
  }

  private async evaluateSinglePolicy(policy: PolicyRule, request: PolicyEvaluationRequest): Promise<any> {
    const config = policy.config as any;
    let action = PolicyAction.ALLOW;
    let message = '';
    let canOverride = false;
    let overrideReasons: OverrideReason[] = [];

    switch (policy.type) {
      case PolicyType.CANCELLATION_WINDOW:
        const cancellationResult = this.evaluateCancellationWindow(config, request);
        action = cancellationResult.action;
        message = cancellationResult.message;
        canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
        if (canOverride) {
          overrideReasons = [OverrideReason.CUSTOMER_REQUEST, OverrideReason.STAFF_ERROR, OverrideReason.EMERGENCY];
        }
        break;

      case PolicyType.RESCHEDULE_LIMIT:
        const rescheduleResult = await this.evaluateRescheduleLimit(config, request);
        action = rescheduleResult.action;
        message = rescheduleResult.message;
        canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
        if (canOverride) {
          overrideReasons = [OverrideReason.CUSTOMER_REQUEST, OverrideReason.STAFF_ERROR, OverrideReason.SPECIAL_CASE];
        }
        break;

      case PolicyType.GRACE_NO_SHOW_PERIOD:
        const graceResult = this.evaluateGracePeriod(config, request);
        action = graceResult.action;
        message = graceResult.message;
        canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
        if (canOverride) {
          overrideReasons = [OverrideReason.EMERGENCY, OverrideReason.STAFF_ERROR, OverrideReason.SYSTEM_ERROR];
        }
        break;

      case PolicyType.BOOKING_WINDOW:
        const bookingResult = this.evaluateBookingWindow(config, request);
        action = bookingResult.action;
        message = bookingResult.message;
        canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
        if (canOverride) {
          overrideReasons = [OverrideReason.SPECIAL_CASE, OverrideReason.CUSTOMER_REQUEST];
        }
        break;

      default:
        action = PolicyAction.ALLOW;
        message = 'No policy restrictions';
        canOverride = false;
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      action,
      message,
      canOverride,
      overrideReasons,
    };
  }

  private evaluateCancellationWindow(config: any, request: PolicyEvaluationRequest): { action: PolicyAction; message: string } {
    if (request.action !== 'CANCEL') {
      return { action: PolicyAction.ALLOW, message: 'Cancellation policy not applicable' };
    }

    const now = new Date();
    const appointmentTime = new Date(request.appointmentTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < config.hoursBeforeAppointment) {
      return {
        action: PolicyAction.BLOCK,
        message: `Cancellation not allowed within ${config.hoursBeforeAppointment} hours of appointment`,
      };
    }

    if (hoursUntilAppointment < config.hoursBeforeAppointment * 2) {
      return {
        action: PolicyAction.WARN,
        message: `Cancelling within ${config.hoursBeforeAppointment * 2} hours may incur penalties`,
      };
    }

    return { action: PolicyAction.ALLOW, message: 'Cancellation allowed' };
  }

  private async evaluateRescheduleLimit(config: any, request: PolicyEvaluationRequest): Promise<{ action: PolicyAction; message: string }> {
    if (request.action !== 'RESCHEDULE') {
      return { action: PolicyAction.ALLOW, message: 'Reschedule policy not applicable' };
    }

    // Count reschedules in the time window
    const timeWindowStart = new Date(Date.now() - config.timeWindowHours * 60 * 60 * 1000);
    
    const rescheduleCount = await prisma.appointment.count({
      where: {
        customerId: request.customerId,
        status: 'RESCHEDULED',
        updatedAt: { gte: timeWindowStart },
      },
    });

    if (rescheduleCount >= config.maxReschedules) {
      return {
        action: PolicyAction.BLOCK,
        message: `Reschedule limit of ${config.maxReschedules} per ${config.timeWindowHours} hours exceeded`,
      };
    }

    if (rescheduleCount >= config.maxReschedules * 0.8) {
      return {
        action: PolicyAction.WARN,
        message: `Approaching reschedule limit (${rescheduleCount}/${config.maxReschedules})`,
      };
    }

    return { action: PolicyAction.ALLOW, message: 'Reschedule allowed' };
  }

  private evaluateGracePeriod(config: any, request: PolicyEvaluationRequest): { action: PolicyAction; message: string } {
    if (request.action !== 'CHECK_IN') {
      return { action: PolicyAction.ALLOW, message: 'Grace period policy not applicable' };
    }

    const now = new Date();
    const appointmentTime = new Date(request.appointmentTime);
    const minutesSinceAppointment = (now.getTime() - appointmentTime.getTime()) / (1000 * 60);

    if (minutesSinceAppointment > config.graceMinutes && minutesSinceAppointment < config.autoCancelMinutes) {
      return {
        action: PolicyAction.WARN,
        message: `Appointment is ${Math.floor(minutesSinceAppointment)} minutes late. Auto-cancellation in ${config.autoCancelMinutes - Math.floor(minutesSinceAppointment)} minutes`,
      };
    }

    if (minutesSinceAppointment >= config.autoCancelMinutes) {
      return {
        action: PolicyAction.BLOCK,
        message: 'Appointment automatically cancelled due to no-show',
      };
    }

    return { action: PolicyAction.ALLOW, message: 'Within grace period' };
  }

  private evaluateBookingWindow(config: any, request: PolicyEvaluationRequest): { action: PolicyAction; message: string } {
    if (request.action !== 'BOOK') {
      return { action: PolicyAction.ALLOW, message: 'Booking window policy not applicable' };
    }

    const now = new Date();
    const appointmentTime = new Date(request.appointmentTime);
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilAppointment = hoursUntilAppointment / 24;

    if (hoursUntilAppointment < config.minHoursInAdvance) {
      return {
        action: PolicyAction.BLOCK,
        message: `Booking requires at least ${config.minHoursInAdvance} hours advance notice`,
      };
    }

    if (daysUntilAppointment > config.maxDaysInAdvance) {
      return {
        action: PolicyAction.BLOCK,
        message: `Booking cannot be made more than ${config.maxDaysInAdvance} days in advance`,
      };
    }

    return { action: PolicyAction.ALLOW, message: 'Booking allowed' };
  }

  private generateResultMessage(finalAction: PolicyAction, policyResults: any[]): string {
    switch (finalAction) {
      case PolicyAction.BLOCK:
        return 'Action blocked by policy restrictions';
      case PolicyAction.WARN:
        return 'Action allowed with warnings';
      case PolicyAction.REQUIRE_APPROVAL:
        return 'Action requires approval';
      default:
        return 'Action allowed';
    }
  }

  private trackPolicyViolation(policyId: string, policyName: string): void {
    const current = this.metrics.policyViolations.get(policyId);
    if (current) {
      current.count++;
      current.lastViolation = new Date();
    } else {
      this.metrics.policyViolations.set(policyId, {
        count: 1,
        lastViolation: new Date(),
      });
    }
  }

  private updateAverageEvaluationTime(newTime: number): void {
    if (this.metrics.totalEvaluations === 1) {
      this.metrics.averageEvaluationTime = newTime;
    } else {
      this.metrics.averageEvaluationTime = 
        (this.metrics.averageEvaluationTime * (this.metrics.totalEvaluations - 1) + newTime) / this.metrics.totalEvaluations;
    }
  }
}
