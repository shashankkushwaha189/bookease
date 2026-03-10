import { AppointmentStatus, UserRole } from "@prisma/client";
import { BookEaseConfig } from "../config/config.schema";

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
    requiresOverride?: boolean;
    overrideReason?: string;
}

export interface PolicyPreview {
    cancellationWindow: {
        allowedUntilHoursBefore: number;
        canCancel: boolean;
        reason?: string;
    };
    rescheduleLimit: {
        maxReschedules: number;
        currentReschedules: number;
        remainingReschedules: number;
        canReschedule: boolean;
        reason?: string;
    };
    noShowGracePeriod: {
        gracePeriodMinutes: number;
        gracePeriodEnds: Date;
    };
}

export interface PolicyOverride {
    userId: string;
    reason: string;
    timestamp: Date;
    action: 'cancel' | 'reschedule';
    appointmentId: string;
    tenantId: string;
}

export class PolicyService {
    private policyOverrides: Map<string, PolicyOverride[]> = new Map();

    /**
     * Enhanced cancellation policy with admin override support
     */
    canCancel(
        appointment: { 
            startTimeUtc: Date; 
            id: string;
            tenantId: string;
        },
        config: BookEaseConfig,
        requestedBy: { 
            role: UserRole; 
            id: string;
        },
        overrideReason?: string
    ): PolicyCheckResult {
        const startTime = Date.now(); // Performance tracking
        
        const allowedUntilHoursBefore = config.cancellation.allowedUntilHoursBefore;
        const now = new Date();
        const diffMs = appointment.startTimeUtc.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const policyTime = Date.now() - startTime;

        if (diffHours < allowedUntilHoursBefore) {
            if (requestedBy.role === UserRole.ADMIN) {
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

                    logger.info({
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
                } else {
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

        logger.debug({
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
    canReschedule(
        rescheduleCount: number,
        config: BookEaseConfig,
        requestedBy: { 
            role: UserRole; 
            id: string;
        },
        appointmentId: string,
        tenantId: string,
        overrideReason?: string
    ): PolicyCheckResult {
        const startTime = Date.now(); // Performance tracking
        
        const maxReschedules = config.cancellation.maxReschedules;

        if (rescheduleCount >= maxReschedules) {
            if (requestedBy.role === UserRole.ADMIN) {
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

                    logger.info({
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
                } else {
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
        
        logger.debug({
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
    shouldMarkNoShow(
        appointment: { 
            startTimeUtc: Date; 
            status: AppointmentStatus;
            id: string;
            tenantId: string;
        },
        config: BookEaseConfig
    ): { shouldMark: boolean; gracePeriodEnds: Date; reason?: string } {
        const startTime = Date.now(); // Performance tracking
        
        if (appointment.status !== AppointmentStatus.BOOKED && appointment.status !== AppointmentStatus.CONFIRMED) {
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

        logger.debug({
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
    generatePolicyPreview(
        config: BookEaseConfig,
        currentReschedules: number = 0
    ): PolicyPreview {
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
    getPolicyOverrides(tenantId: string): PolicyOverride[] {
        return this.policyOverrides.get(tenantId) || [];
    }

    /**
     * Check if policy updates would affect historical data
     */
    validatePolicyUpdate(
        oldConfig: BookEaseConfig,
        newConfig: BookEaseConfig,
        tenantId: string
    ): { valid: boolean; warnings: string[] } {
        const warnings: string[] = [];
        
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

        logger.info({
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
    private logPolicyOverride(override: PolicyOverride): void {
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
    clearPolicyOverrides(tenantId?: string): void {
        if (tenantId) {
            this.policyOverrides.delete(tenantId);
        } else {
            this.policyOverrides.clear();
        }
    }
}

export const policyService = new PolicyService();
