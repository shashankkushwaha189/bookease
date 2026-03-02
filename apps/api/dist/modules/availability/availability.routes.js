"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const availability_controller_1 = require("./availability.controller");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const router = (0, express_1.Router)();
// Public endpoint
router.get('/', tenant_middleware_1.tenantMiddleware, availability_controller_1.availabilityController.getAvailability);
exports.default = router;
