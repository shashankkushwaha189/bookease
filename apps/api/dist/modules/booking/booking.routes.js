"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("./booking.controller");
const consent_service_1 = require("../consent/consent.service");
const consent_repository_1 = require("../consent/consent.repository");
const validate_1 = require("../../middleware/validate");
const booking_schema_1 = require("./booking.schema");
const router = (0, express_1.Router)();
const consentRepository = new consent_repository_1.ConsentRepository();
const consentService = new consent_service_1.ConsentService(consentRepository);
const controller = new booking_controller_1.BookingController(consentService);
// Public booking route (requires X-Tenant-ID but NO auth)
router.post('/', (0, validate_1.validateBody)(booking_schema_1.createBookingSchema), controller.createPublicBooking);
exports.default = router;
