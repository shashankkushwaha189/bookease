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
// Protected endpoints (auth required)
router.get('/', controller.getProfile);
router.post('/', (0, validate_1.validateBody)(business_profile_schema_1.createBusinessProfileSchema), controller.upsertProfile);
router.patch('/', controller.updateProfile);
router.patch('/branding', controller.updateBranding);
router.patch('/policy', controller.updatePolicy);
router.patch('/seo', controller.updateSEO);
router.patch('/contact', controller.updateContact);
// Public endpoints (no auth required)
router.get('/public', controller.getPublicProfile);
router.get('/public/slug/:slug', controller.getPublicProfileBySlug);
router.get('/public/all', controller.getPublicProfiles);
router.get('/public/search', controller.searchProfiles);
// Validation endpoint
router.get('/validate', controller.validateProfileAccess);
exports.default = router;
