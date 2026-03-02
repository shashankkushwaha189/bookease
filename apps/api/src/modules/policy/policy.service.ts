import { AppointmentStatus, UserRole } from "@prisma/client";
import { BookEaseConfig } from "../config/config.schema";

export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
}

export class PolicyService {
    /**
     * Function 1: Check if an appointment can be cancelled based on time window.
     */
    canCancel(
        appointment: { startTimeUtc: Date },
        config: BookEaseConfig,
        requestedBy: { role: UserRole }
    ): PolicyCheckResult {
        const allowedUntilHoursBefore = config.cancellation.allowedUntilHoursBefore;
        const now = new Date();
        const diffMs = appointment.startTimeUtc.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < allowedUntilHoursBefore) {
            if (requestedBy.role === UserRole.ADMIN) {
                return { allowed: true }; // Admin can override
            }
            return {
                allowed: false,
                reason: "Cancellation window has closed",
            };
        }

        return { allowed: true };
    }

    /**
     * Function 2: Check if an appointment can be rescheduled based on limit.
     */
    canReschedule(
        rescheduleCount: number,
        config: BookEaseConfig,
        requestedBy: { role: UserRole }
    ): PolicyCheckResult {
        const maxReschedules = config.cancellation.maxReschedules;

        if (rescheduleCount >= maxReschedules) {
            if (requestedBy.role === UserRole.ADMIN) {
                return { allowed: true }; // Admin can override
            }
            return {
                allowed: false,
                reason: "Reschedule limit reached",
            };
        }

        return { allowed: true };
    }

    /**
     * Function 3: Determine if an appointment should be marked as NO_SHOW.
     */
    shouldMarkNoShow(
        appointment: { startTimeUtc: Date; status: AppointmentStatus },
        config: BookEaseConfig
    ): boolean {
        if (appointment.status !== AppointmentStatus.BOOKED && appointment.status !== AppointmentStatus.CONFIRMED) {
            return false;
        }

        const gracePeriodMinutes = config.cancellation.noShowGracePeriodMinutes;
        const now = new Date();
        const graceTimeMs = appointment.startTimeUtc.getTime() + (gracePeriodMinutes * 60 * 1000);

        return now.getTime() > graceTimeMs;
    }
}

export const policyService = new PolicyService();
