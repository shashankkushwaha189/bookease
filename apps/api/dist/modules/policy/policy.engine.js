"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const policy_schema_1 = require("./policy.schema");
const prisma_1 = require("../../lib/prisma");
class PolicyEngine {
    metrics = {
        totalEvaluations: 0,
        blockedActions: 0,
        overriddenActions: 0,
        averageEvaluationTime: 0,
        policyViolations: new Map(),
        lastReset: new Date().toISOString(),
    };
    // Evaluate policy for a given action
    async evaluatePolicy(request) {
        const startTime = Date.now();
        this.metrics.totalEvaluations++;
        try {
            // Validate request
            const validatedRequest = policy_schema_1.policyEvaluationRequestSchema.parse(request);
            // Get applicable policies
            const applicablePolicies = await this.getApplicablePolicies(validatedRequest);
            // Evaluate each policy
            const policyResults = [];
            let finalAction = policy_schema_1.PolicyAction.ALLOW;
            const warnings = [];
            let overrideRequired = false;
            for (const policy of applicablePolicies) {
                const result = await this.evaluateSinglePolicy(policy, validatedRequest);
                policyResults.push(result);
                // Determine the most restrictive action
                if (result.action === policy_schema_1.PolicyAction.BLOCK) {
                    finalAction = policy_schema_1.PolicyAction.BLOCK;
                }
                else if (result.action === policy_schema_1.PolicyAction.REQUIRE_APPROVAL && finalAction !== policy_schema_1.PolicyAction.BLOCK) {
                    finalAction = policy_schema_1.PolicyAction.REQUIRE_APPROVAL;
                    overrideRequired = true;
                }
                else if (result.action === policy_schema_1.PolicyAction.WARN && finalAction === policy_schema_1.PolicyAction.ALLOW) {
                    finalAction = policy_schema_1.PolicyAction.WARN;
                    warnings.push(result.message);
                }
                // Track policy violations
                if (result.action === policy_schema_1.PolicyAction.BLOCK) {
                    this.trackPolicyViolation(policy.id, policy.name);
                }
            }
            const evaluationTime = Date.now() - startTime;
            this.updateAverageEvaluationTime(evaluationTime);
            return {
                action: finalAction,
                message: this.generateResultMessage(finalAction, policyResults),
                policies: policyResults,
                overrideRequired,
                warnings,
                metadata: {
                    evaluationTime,
                    policiesEvaluated: applicablePolicies.length,
                },
            };
        }
        catch (error) {
            this.metrics.blockedActions++;
            throw error;
        }
    }
    // Override policy decision
    async overridePolicy(override) {
        const validatedOverride = policy_schema_1.policyOverrideSchema.parse(override);
        // Log the override
        await prisma_1.prisma.policyOverride.create({
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
    async previewPolicies(preview) {
        const validatedPreview = policy_schema_1.policyPreviewSchema.parse(preview);
        const mockRequest = {
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
    async createPolicy(policy) {
        const validatedPolicy = policy_schema_1.policyRuleSchema.parse(policy);
        const createdPolicy = await prisma_1.prisma.policyRule.create({
            data: {
                ...validatedPolicy,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        return createdPolicy;
    }
    // Update existing policy
    async updatePolicy(id, updates) {
        const validatedUpdates = policy_schema_1.policyRuleSchema.partial().parse(updates);
        // Create new version of policy to preserve historical data
        const existingPolicy = await prisma_1.prisma.policyRule.findUnique({
            where: { id },
        });
        if (!existingPolicy) {
            throw new Error('Policy not found');
        }
        // Archive old policy version
        await prisma_1.prisma.policyRuleArchive.create({
            data: {
                ...existingPolicy,
                archivedAt: new Date(),
                archivedBy: updates.updatedBy || existingPolicy.updatedBy,
            },
        });
        // Update policy with new version
        const updatedPolicy = await prisma_1.prisma.policyRule.update({
            where: { id },
            data: {
                ...validatedUpdates,
                updatedAt: new Date(),
                version: { increment: 1 },
            },
        });
        return updatedPolicy;
    }
    // Get policy metrics
    getMetrics() {
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
    resetMetrics() {
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
    async getApplicablePolicies(request) {
        // Get all active policies
        const allPolicies = await prisma_1.prisma.policyRule.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' }, // Higher priority first
        });
        // Filter applicable policies based on conditions
        return allPolicies.filter(policy => {
            if (!policy.conditions)
                return true;
            const conditions = policy.conditions;
            // Check service conditions
            if (conditions.serviceIds && conditions.serviceIds.length > 0) {
                if (!conditions.serviceIds.includes(request.serviceId))
                    return false;
            }
            // Check staff conditions
            if (conditions.staffIds && conditions.staffIds.length > 0) {
                if (!conditions.staffIds.includes(request.staffId))
                    return false;
            }
            // Check time conditions
            if (conditions.timeRanges && conditions.timeRanges.length > 0) {
                const appointmentDate = new Date(request.appointmentTime);
                const dayOfWeek = appointmentDate.getDay();
                const hour = appointmentDate.getHours();
                const timeRangeMatch = conditions.timeRanges.some((range) => {
                    const inDaysOfWeek = range.daysOfWeek.includes(dayOfWeek);
                    const inHourRange = hour >= range.startHour && hour < range.endHour;
                    return inDaysOfWeek && inHourRange;
                });
                if (!timeRangeMatch)
                    return false;
            }
            return true;
        });
    }
    async evaluateSinglePolicy(policy, request) {
        const config = policy.config;
        let action = policy_schema_1.PolicyAction.ALLOW;
        let message = '';
        let canOverride = false;
        let overrideReasons = [];
        switch (policy.type) {
            case policy_schema_1.PolicyType.CANCELLATION_WINDOW:
                const cancellationResult = this.evaluateCancellationWindow(config, request);
                action = cancellationResult.action;
                message = cancellationResult.message;
                canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
                if (canOverride) {
                    overrideReasons = [policy_schema_1.OverrideReason.CUSTOMER_REQUEST, policy_schema_1.OverrideReason.STAFF_ERROR, policy_schema_1.OverrideReason.EMERGENCY];
                }
                break;
            case policy_schema_1.PolicyType.RESCHEDULE_LIMIT:
                const rescheduleResult = await this.evaluateRescheduleLimit(config, request);
                action = rescheduleResult.action;
                message = rescheduleResult.message;
                canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
                if (canOverride) {
                    overrideReasons = [policy_schema_1.OverrideReason.CUSTOMER_REQUEST, policy_schema_1.OverrideReason.STAFF_ERROR, policy_schema_1.OverrideReason.SPECIAL_CASE];
                }
                break;
            case policy_schema_1.PolicyType.GRACE_NO_SHOW_PERIOD:
                const graceResult = this.evaluateGracePeriod(config, request);
                action = graceResult.action;
                message = graceResult.message;
                canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
                if (canOverride) {
                    overrideReasons = [policy_schema_1.OverrideReason.EMERGENCY, policy_schema_1.OverrideReason.STAFF_ERROR, policy_schema_1.OverrideReason.SYSTEM_ERROR];
                }
                break;
            case policy_schema_1.PolicyType.BOOKING_WINDOW:
                const bookingResult = this.evaluateBookingWindow(config, request);
                action = bookingResult.action;
                message = bookingResult.message;
                canOverride = config.allowAdminOverride && (request.userRole === 'ADMIN' || request.userRole === 'STAFF');
                if (canOverride) {
                    overrideReasons = [policy_schema_1.OverrideReason.SPECIAL_CASE, policy_schema_1.OverrideReason.CUSTOMER_REQUEST];
                }
                break;
            default:
                action = policy_schema_1.PolicyAction.ALLOW;
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
    evaluateCancellationWindow(config, request) {
        if (request.action !== 'CANCEL') {
            return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Cancellation policy not applicable' };
        }
        const now = new Date();
        const appointmentTime = new Date(request.appointmentTime);
        const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilAppointment < config.hoursBeforeAppointment) {
            return {
                action: policy_schema_1.PolicyAction.BLOCK,
                message: `Cancellation not allowed within ${config.hoursBeforeAppointment} hours of appointment`,
            };
        }
        if (hoursUntilAppointment < config.hoursBeforeAppointment * 2) {
            return {
                action: policy_schema_1.PolicyAction.WARN,
                message: `Cancelling within ${config.hoursBeforeAppointment * 2} hours may incur penalties`,
            };
        }
        return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Cancellation allowed' };
    }
    async evaluateRescheduleLimit(config, request) {
        if (request.action !== 'RESCHEDULE') {
            return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Reschedule policy not applicable' };
        }
        // Count reschedules in the time window
        const timeWindowStart = new Date(Date.now() - config.timeWindowHours * 60 * 60 * 1000);
        const rescheduleCount = await prisma_1.prisma.appointment.count({
            where: {
                customerId: request.customerId,
                status: 'RESCHEDULED',
                updatedAt: { gte: timeWindowStart },
            },
        });
        if (rescheduleCount >= config.maxReschedules) {
            return {
                action: policy_schema_1.PolicyAction.BLOCK,
                message: `Reschedule limit of ${config.maxReschedules} per ${config.timeWindowHours} hours exceeded`,
            };
        }
        if (rescheduleCount >= config.maxReschedules * 0.8) {
            return {
                action: policy_schema_1.PolicyAction.WARN,
                message: `Approaching reschedule limit (${rescheduleCount}/${config.maxReschedules})`,
            };
        }
        return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Reschedule allowed' };
    }
    evaluateGracePeriod(config, request) {
        if (request.action !== 'CHECK_IN') {
            return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Grace period policy not applicable' };
        }
        const now = new Date();
        const appointmentTime = new Date(request.appointmentTime);
        const minutesSinceAppointment = (now.getTime() - appointmentTime.getTime()) / (1000 * 60);
        if (minutesSinceAppointment > config.graceMinutes && minutesSinceAppointment < config.autoCancelMinutes) {
            return {
                action: policy_schema_1.PolicyAction.WARN,
                message: `Appointment is ${Math.floor(minutesSinceAppointment)} minutes late. Auto-cancellation in ${config.autoCancelMinutes - Math.floor(minutesSinceAppointment)} minutes`,
            };
        }
        if (minutesSinceAppointment >= config.autoCancelMinutes) {
            return {
                action: policy_schema_1.PolicyAction.BLOCK,
                message: 'Appointment automatically cancelled due to no-show',
            };
        }
        return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Within grace period' };
    }
    evaluateBookingWindow(config, request) {
        if (request.action !== 'BOOK') {
            return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Booking window policy not applicable' };
        }
        const now = new Date();
        const appointmentTime = new Date(request.appointmentTime);
        const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysUntilAppointment = hoursUntilAppointment / 24;
        if (hoursUntilAppointment < config.minHoursInAdvance) {
            return {
                action: policy_schema_1.PolicyAction.BLOCK,
                message: `Booking requires at least ${config.minHoursInAdvance} hours advance notice`,
            };
        }
        if (daysUntilAppointment > config.maxDaysInAdvance) {
            return {
                action: policy_schema_1.PolicyAction.BLOCK,
                message: `Booking cannot be made more than ${config.maxDaysInAdvance} days in advance`,
            };
        }
        return { action: policy_schema_1.PolicyAction.ALLOW, message: 'Booking allowed' };
    }
    generateResultMessage(finalAction, policyResults) {
        switch (finalAction) {
            case policy_schema_1.PolicyAction.BLOCK:
                return 'Action blocked by policy restrictions';
            case policy_schema_1.PolicyAction.WARN:
                return 'Action allowed with warnings';
            case policy_schema_1.PolicyAction.REQUIRE_APPROVAL:
                return 'Action requires approval';
            default:
                return 'Action allowed';
        }
    }
    trackPolicyViolation(policyId, policyName) {
        const current = this.metrics.policyViolations.get(policyId);
        if (current) {
            current.count++;
            current.lastViolation = new Date();
        }
        else {
            this.metrics.policyViolations.set(policyId, {
                count: 1,
                lastViolation: new Date(),
            });
        }
    }
    updateAverageEvaluationTime(newTime) {
        if (this.metrics.totalEvaluations === 1) {
            this.metrics.averageEvaluationTime = newTime;
        }
        else {
            this.metrics.averageEvaluationTime =
                (this.metrics.averageEvaluationTime * (this.metrics.totalEvaluations - 1) + newTime) / this.metrics.totalEvaluations;
        }
    }
}
exports.PolicyEngine = PolicyEngine;
