"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyService = exports.PolicyService = void 0;
const client_1 = require("@prisma/client");
class PolicyService {
    /**
     * Function 1: Check if an appointment can be cancelled based on time window.
     */
    canCancel(appointment, config, requestedBy) {
        const allowedUntilHoursBefore = config.cancellation.allowedUntilHoursBefore;
        const now = new Date();
        const diffMs = appointment.startTimeUtc.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < allowedUntilHoursBefore) {
            if (requestedBy.role === client_1.UserRole.ADMIN) {
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
    canReschedule(rescheduleCount, config, requestedBy) {
        const maxReschedules = config.cancellation.maxReschedules;
        if (rescheduleCount >= maxReschedules) {
            if (requestedBy.role === client_1.UserRole.ADMIN) {
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
    shouldMarkNoShow(appointment, config) {
        if (appointment.status !== client_1.AppointmentStatus.BOOKED && appointment.status !== client_1.AppointmentStatus.CONFIRMED) {
            return false;
        }
        const gracePeriodMinutes = config.cancellation.noShowGracePeriodMinutes;
        const now = new Date();
        const graceTimeMs = appointment.startTimeUtc.getTime() + (gracePeriodMinutes * 60 * 1000);
        return now.getTime() > graceTimeMs;
    }
}
exports.PolicyService = PolicyService;
exports.policyService = new PolicyService();
