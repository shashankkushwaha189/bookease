"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const business_profile_controller_1 = require("./business-profile.controller");
const business_profile_service_1 = require("./business-profile.service");
const business_profile_repository_1 = require("./business-profile.repository");
const validate_1 = require("../../middleware/validate");
const business_profile_schema_1 = require("./business-profile.schema");
const router = (0, express_1.Router)();
const repository = new business_profile_repository_1.BusinessProfileRepository();
const service = new business_profile_service_1.BusinessProfileService(repository);
const controller = new business_profile_controller_1.BusinessProfileController(service);
// Private Admin Routes (scoped by tenantId from header)
router.get('/', controller.getProfile);
router.post('/', (0, validate_1.validateBody)(business_profile_schema_1.createBusinessProfileSchema), controller.upsertProfile);
// Public Route (also requires X-Tenant-ID but returns subset)
// We'll use a separate path for public access in app.ts but we can define it here too
router.get('/public', controller.getPublicProfile);
exports.default = router;
