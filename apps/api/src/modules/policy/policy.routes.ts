import { Router } from "express";
import { policyController } from "./policy.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { UserRole } from "@prisma/client";

export const policyRouter = Router();

// Apply tenant middleware to all routes
policyRouter.use(tenantMiddleware);

// Public endpoint for policy preview (no auth required)
policyRouter.get("/preview", policyController.getPolicyPreview);

// Admin-only endpoints
policyRouter.get("/overrides", 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    policyController.getPolicyOverrides
);

policyRouter.post("/validate-update", 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    policyController.validatePolicyUpdate
);

policyRouter.post("/test", 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    policyController.testPolicyEnforcement
);

policyRouter.delete("/overrides", 
    authMiddleware, 
    requireRole(UserRole.ADMIN), 
    policyController.clearPolicyOverrides
);

export default policyRouter;
