"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const smart_scheduling_controller_1 = require("./smart-scheduling.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all routes
router.use(auth_middleware_1.authMiddleware);
// Get optimized time slots for a service
router.get('/time-slots/:serviceId', smart_scheduling_controller_1.smartSchedulingController.getOptimizedTimeSlots);
// Get staff recommendations for a service
router.post('/staff-recommendations/:serviceId', smart_scheduling_controller_1.smartSchedulingController.getStaffRecommendations);
// Get peak hours analysis
router.get('/peak-hours', smart_scheduling_controller_1.smartSchedulingController.getPeakHours);
exports.default = router;
