import { Request, Response } from "express";
import { policyService } from "./policy.service";
import { configService } from "../config/config.service";
import { UserRole } from "@prisma/client";
import { logger } from "@bookease/logger";

export class PolicyController {
    /**
     * Get policy preview for booking page
     */
    getPolicyPreview = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { currentReschedules = 0 } = req.query;

            const config = await configService.getConfig(tenantId);
            const preview = policyService.generatePolicyPreview(
                config, 
                Number(currentReschedules)
            );

            res.json({
                success: true,
                data: preview
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get policy preview failed');
            
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
    getPolicyOverrides = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            
            // Verify admin role
            const userRole = (req as any).user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to view policy overrides"
                    }
                });
            }

            const overrides = policyService.getPolicyOverrides(tenantId);

            res.json({
                success: true,
                data: {
                    overrides,
                    count: overrides.length
                }
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Get policy overrides failed');
            
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
    validatePolicyUpdate = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { newConfig } = req.body;

            // Verify admin role
            const userRole = (req as any).user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to validate policy updates"
                    }
                });
            }

            const currentConfig = await configService.getConfig(tenantId);
            const validation = policyService.validatePolicyUpdate(currentConfig, newConfig, tenantId);

            res.json({
                success: true,
                data: validation
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Validate policy update failed');
            
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
    testPolicyEnforcement = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            const { 
                testType, 
                appointmentData, 
                userId, 
                userRole = "STAFF",
                overrideReason 
            } = req.body;

            // Verify admin role for testing
            const requestUserRole = (req as any).user?.role || req.headers["x-user-role"];
            if (requestUserRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to test policies"
                    }
                });
            }

            const config = await configService.getConfig(tenantId);
            const startTime = Date.now();

            let result;
            switch (testType) {
                case "cancellation":
                    result = policyService.canCancel(
                        appointmentData,
                        config,
                        { role: userRole, id: userId },
                        overrideReason
                    );
                    break;
                case "reschedule":
                    result = policyService.canReschedule(
                        appointmentData.rescheduleCount,
                        config,
                        { role: userRole, id: userId },
                        appointmentData.id,
                        tenantId,
                        overrideReason
                    );
                    break;
                case "noshow":
                    result = policyService.shouldMarkNoShow(appointmentData, config);
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
                ? { shouldMark: (result as any).shouldMark, gracePeriodEnds: (result as any).gracePeriodEnds }
                : { allowed: (result as any).allowed, reason: (result as any).reason };

            logger.info({
                tenantId,
                testType,
                userId,
                userRole,
                enforcementTime,
                result: testType === "noshow" ? (result as any).shouldMark : (result as any).allowed
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
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Test policy enforcement failed');
            
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
    clearPolicyOverrides = async (req: Request, res: Response) => {
        try {
            const tenantId = String(req.headers["x-tenant-id"] || "");
            
            // Verify admin role
            const userRole = (req as any).user?.role || req.headers["x-user-role"];
            if (userRole !== "ADMIN") {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Admin access required to clear policy overrides"
                    }
                });
            }

            policyService.clearPolicyOverrides(tenantId);

            logger.info({
                tenantId,
                adminId: (req as any).user?.id || req.headers["x-user-id"]
            }, 'Policy overrides cleared');

            res.json({
                success: true,
                data: {
                    message: "Policy overrides cleared successfully"
                }
            });
        } catch (error: any) {
            logger.error({ error: error.message, tenantId: req.headers["x-tenant-id"] }, 'Clear policy overrides failed');
            
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

export const policyController = new PolicyController();
