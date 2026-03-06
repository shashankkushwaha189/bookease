"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyController = exports.PolicyController = void 0;
const policy_service_1 = require("./policy.service");
const config_service_1 = require("../config/config.service");
const logger_1 = require("@bookease/logger");
class PolicyController {
    /**
     * Get policy preview for booking page
     */
    getPolicyPreview = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { currentReschedules = 0 } = req.query;
            const config = await config_service_1.configService.getConfig(tenantId);
            const preview = policy_service_1.policyService.generatePolicyPreview(config, Number(currentReschedules));
            res.json({
                success: true,
                data: preview
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get policy preview failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get policy preview"
                }
            });
        }
    };
    /**
     * Get policy overrides for audit trail
     */
    getPolicyOverrides = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            // Verify admin role
            const userRole = req.user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to view policy overrides"
                    }
                });
            }
            const overrides = policy_service_1.policyService.getPolicyOverrides(tenantId);
            res.json({
                success: true,
                data: {
                    overrides,
                    count: overrides.length
                }
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get policy overrides failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get policy overrides"
                }
            });
        }
    };
    /**
     * Validate policy update
     */
    validatePolicyUpdate = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { newConfig } = req.body;
            // Verify admin role
            const userRole = req.user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to validate policy updates"
                    }
                });
            }
            const currentConfig = await config_service_1.configService.getConfig(tenantId);
            const validation = policy_service_1.policyService.validatePolicyUpdate(currentConfig, newConfig, tenantId);
            res.json({
                success: true,
                data: validation
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Validate policy update failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to validate policy update"
                }
            });
        }
    };
    /**
     * Test policy enforcement (for debugging)
     */
    testPolicyEnforcement = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { testType, appointmentData, userId, userRole = "STAFF", overrideReason } = req.body;
            // Verify admin role for testing
            const requestUserRole = req.user?.role || req.headers["x-user-role"];
            if (requestUserRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to test policies"
                    }
                });
            }
            const config = await config_service_1.configService.getConfig(tenantId);
            const startTime = Date.now();
            let result;
            switch (testType) {
                case "cancellation":
                    result = policy_service_1.policyService.canCancel(appointmentData, config, { role: userRole, id: userId }, overrideReason);
                    break;
                case "reschedule":
                    result = policy_service_1.policyService.canReschedule(appointmentData.rescheduleCount, config, { role: userRole, id: userId }, appointmentData.id, tenantId, overrideReason);
                    break;
                case "noshow":
                    result = policy_service_1.policyService.shouldMarkNoShow(appointmentData, config);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: "INVALID_TEST_TYPE",
                            message: "Test type must be 'cancellation', 'reschedule', or 'noshow'"
                        }
                    });
            }
            const enforcementTime = Date.now() - startTime;
            // Extract the appropriate result based on test type
            const extractedResult = testType === "noshow"
                ? { shouldMark: result.shouldMark, gracePeriodEnds: result.gracePeriodEnds }
                : { allowed: result.allowed, reason: result.reason };
            logger_1.logger.info({
                tenantId,
                testType,
                userId,
                userRole,
                enforcementTime,
                result: testType === "noshow" ? result.shouldMark : result.allowed
            }, 'Policy enforcement test completed');
            res.json({
                success: true,
                data: {
                    testType,
                    result: extractedResult,
                    enforcementTime: `${enforcementTime}ms`,
                    performanceRequirement: enforcementTime < 200 ? "PASS" : "FAIL"
                }
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Test policy enforcement failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to test policy enforcement"
                }
            });
        }
    };
    /**
     * Clear policy overrides (admin only)
     */
    clearPolicyOverrides = async (req, res) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            // Verify admin role
            const userRole = req.user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to clear policy overrides"
                    }
                });
            }
            policy_service_1.policyService.clearPolicyOverrides(tenantId);
            logger_1.logger.info({
                tenantId,
                adminId: req.user?.id || req.headers["x-user-id"]
            }, 'Policy overrides cleared');
            res.json({
                success: true,
                data: {
                    message: "Policy overrides cleared successfully"
                }
            });
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Clear policy overrides failed');
            res.status(500).json({
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to clear policy overrides"
                }
            });
        }
    };
}
exports.PolicyController = PolicyController;
exports.policyController = new PolicyController();
