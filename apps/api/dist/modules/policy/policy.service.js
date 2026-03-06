"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = exports.PolicyService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("@bookease/logger");
class PolicyService {
    policyOverrides = new Map();
    /**
     * Enhanced cancellation policy with admin override support
     */
    canCancel(appointment, config, requestedBy, overrideReason) {
        const startTime = Date.now(); // Performance tracking
        const allowedUntilHoursBefore = config.cancellation.allowedUntilHoursBefore;
        const now = new Date();
        const diffMs = appointment.startTimeUtc.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const policyTime = Date.now() - startTime;
        if (diffHours < allowedUntilHoursBefore) {
            if (requestedBy.role === client_1.UserRole.ADMIN) {
                if (overrideReason && overrideReason.length >= 10) {
                    // Log admin override
                    this.logPolicyOverride({
                        userId: requestedBy.id,
                        reason: overrideReason,
                        timestamp: new Date(),
                        action: 'cancel',
                        appointmentId: appointment.id,
                        tenantId: appointment.tenantId
                    });
                    logger_1.logger.info({
                        tenantId: appointment.tenantId,
                        appointmentId: appointment.id,
                        adminId: requestedBy.id,
                        overrideReason,
                        diffHours,
                        allowedUntilHoursBefore
                    }, 'Admin override for cancellation policy');
                    return {
                        allowed: true,
                        overrideReason,
                        requiresOverride: true
                    };
                }
                else {
                    return {
                        allowed: false,
                        reason: "Admin override requires a reason of at least 10 characters",
                        requiresOverride: true
                    };
                }
            }
            return {
                allowed: false,
                reason: `Cancellation window has closed. Cancellations must be made at least ${allowedUntilHoursBefore} hours before appointment time.`,
                requiresOverride: true
            };
        }
        logger_1.logger.debug({
            tenantId: appointment.tenantId,
            appointmentId: appointment.id,
            userId: requestedBy.id,
            policyTime,
            diffHours
        }, 'Cancellation policy check completed');
        return { allowed: true };
    }
    /**
     * Enhanced reschedule policy with admin override support
     */
    canReschedule(rescheduleCount, config, requestedBy, appointmentId, tenantId, overrideReason) {
        const startTime = Date.now(); // Performance tracking
        const maxReschedules = config.cancellation.maxReschedules;
        if (rescheduleCount >= maxReschedules) {
            if (requestedBy.role === client_1.UserRole.ADMIN) {
                if (overrideReason && overrideReason.length >= 10) {
                    // Log admin override
                    this.logPolicyOverride({
                        userId: requestedBy.id,
                        reason: overrideReason,
                        timestamp: new Date(),
                        action: 'reschedule',
                        appointmentId: appointmentId,
                        tenantId: tenantId
                    });
                    logger_1.logger.info({
                        tenantId: tenantId,
                        appointmentId: appointmentId,
                        adminId: requestedBy.id,
                        overrideReason,
                        rescheduleCount,
                        maxReschedules
                    }, 'Admin override for reschedule policy');
                    return {
                        allowed: true,
                        overrideReason,
                        requiresOverride: true
                    };
                }
                else {
                    return {
                        allowed: false,
                        reason: "Admin override requires a reason of at least 10 characters",
                        requiresOverride: true
                    };
                }
            }
            return {
                allowed: false,
                reason: `Reschedule limit reached. Maximum ${maxReschedules} reschedules allowed.`,
                requiresOverride: true
            };
        }
        const policyTime = Date.now() - startTime;
        logger_1.logger.debug({
            tenantId: tenantId,
            appointmentId: appointmentId,
            userId: requestedBy.id,
            policyTime,
            rescheduleCount,
            maxReschedules
        }, 'Reschedule policy check completed');
        return { allowed: true };
    }
    /**
     * Enhanced no-show detection with grace period
     */
    shouldMarkNoShow(appointment, config) {
        const startTime = Date.now(); // Performance tracking
        if (appointment.status !== client_1.AppointmentStatus.BOOKED && appointment.status !== client_1.AppointmentStatus.CONFIRMED) {
            return {
                shouldMark: false,
                gracePeriodEnds: new Date(appointment.startTimeUtc.getTime() + config.cancellation.noShowGracePeriodMinutes * 60 * 1000),
                reason: "Appointment not in active status"
            };
        }
        const gracePeriodMinutes = config.cancellation.noShowGracePeriodMinutes;
        const now = new Date();
        const graceTimeMs = appointment.startTimeUtc.getTime() + (gracePeriodMinutes * 60 * 1000);
        const gracePeriodEnds = new Date(graceTimeMs);
        const shouldMark = now.getTime() > graceTimeMs;
        const policyTime = Date.now() - startTime;
        logger_1.logger.debug({
            tenantId: appointment.tenantId,
            appointmentId: appointment.id,
            policyTime,
            gracePeriodMinutes,
            gracePeriodEnds,
            shouldMark
        }, 'No-show policy check completed');
        return {
            shouldMark,
            gracePeriodEnds,
            reason: shouldMark ? `Grace period of ${gracePeriodMinutes} minutes has passed` : undefined
        };
    }
    /**
     * Generate policy preview for booking page
     */
    generatePolicyPreview(config, currentReschedules = 0) {
        const now = new Date();
        return {
            cancellationWindow: {
                allowedUntilHoursBefore: config.cancellation.allowedUntilHoursBefore,
                canCancel: true, // Simplified for preview
                reason: `Cancellations must be made at least ${config.cancellation.allowedUntilHoursBefore} hours before appointment time`
            },
            rescheduleLimit: {
                maxReschedules: config.cancellation.maxReschedules,
                currentReschedules,
                remainingReschedules: Math.max(0, config.cancellation.maxReschedules - currentReschedules),
                canReschedule: currentReschedules < config.cancellation.maxReschedules,
                reason: currentReschedules >= config.cancellation.maxReschedules ?
                    `Maximum ${config.cancellation.maxReschedules} reschedules reached` : undefined
            },
            noShowGracePeriod: {
                gracePeriodMinutes: config.cancellation.noShowGracePeriodMinutes,
                gracePeriodEnds: new Date(now.getTime() + config.cancellation.noShowGracePeriodMinutes * 60 * 1000)
            }
        };
    }
    /**
     * Get policy overrides for audit trail
     */
    getPolicyOverrides(tenantId) {
        return this.policyOverrides.get(tenantId) || [];
    }
    /**
     * Check if policy updates would affect historical data
     */
    validatePolicyUpdate(oldConfig, newConfig, tenantId) {
        const warnings = [];
        // Check cancellation window changes
        if (newConfig.cancellation.allowedUntilHoursBefore > oldConfig.cancellation.allowedUntilHoursBefore) {
            warnings.push('Cancellation window extended - existing appointments may have different cancellation rules');
        }
        // Check reschedule limit changes
        if (newConfig.cancellation.maxReschedules < oldConfig.cancellation.maxReschedules) {
            warnings.push('Reschedule limit reduced - existing appointments may exceed new limit');
        }
        // Check grace period changes
        if (newConfig.cancellation.noShowGracePeriodMinutes !== oldConfig.cancellation.noShowGracePeriodMinutes) {
            warnings.push('No-show grace period changed - historical no-show markings may be inconsistent');
        }
        logger_1.logger.info({
            tenantId,
            warnings: warnings.length,
            configChanges: {
                cancellationWindow: {
                    old: oldConfig.cancellation.allowedUntilHoursBefore,
                    new: newConfig.cancellation.allowedUntilHoursBefore
                },
                rescheduleLimit: {
                    old: oldConfig.cancellation.maxReschedules,
                    new: newConfig.cancellation.maxReschedules
                },
                gracePeriod: {
                    old: oldConfig.cancellation.noShowGracePeriodMinutes,
                    new: newConfig.cancellation.noShowGracePeriodMinutes
                }
            }
        }, 'Policy update validation completed');
        return { valid: true, warnings };
    }
    /**
     * Log policy override for audit trail
     */
    logPolicyOverride(override) {
        const tenantOverrides = this.policyOverrides.get(override.tenantId) || [];
        tenantOverrides.push(override);
        this.policyOverrides.set(override.tenantId, tenantOverrides);
        // Keep only last 100 overrides per tenant to prevent memory issues
        if (tenantOverrides.length > 100) {
            this.policyOverrides.set(override.tenantId, tenantOverrides.slice(-100));
        }
    }
    /**
     * Clear policy overrides (for testing or data cleanup)
     */
    clearPolicyOverrides(tenantId) {
        if (tenantId) {
            this.policyOverrides.delete(tenantId);
        }
        else {
            this.policyOverrides.clear();
        }
    }
}
exports.PolicyService = PolicyService;
exports.policyService = new PolicyService();
