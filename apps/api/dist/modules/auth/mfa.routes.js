"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mfa_controller_1 = require("./mfa.controller");
const validate_1 = require("../../middleware/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const controller = new mfa_controller_1.MFAController();
// Validation schemas
const enableMFASchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    token: zod_1.z.string().min(1, 'Token is required'),
    secret: zod_1.z.string().optional(),
});
const verifyMFASchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    token: zod_1.z.string().min(1, 'Token is required'),
    code: zod_1.z.string().min(4, 'Code must be at least 4 characters'),
});
const disableMFASchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    token: zod_1.z.string().min(1, 'Token is required'),
});
const generateSMSSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    phoneNumber: zod_1.z.string().min(10, 'Phone number must be at least 10 characters'),
});
const verifySMSSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    code: zod_1.z.string().min(4, 'Code must be at least 4 characters'),
});
const sendEmailSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    email: zod_1.z.string().email('Invalid email format'),
});
const verifyEmailSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    code: zod_1.z.string().min(3, 'Code must be at least 3 characters'),
});
const generateRecoverySchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
});
const verifyRecoverySchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID'),
    code: zod_1.z.string().min(4, 'Code must be at least 4 characters'),
});
// MFA routes
router.post('/setup', (0, validate_1.validateBody)(enableMFASchema), controller.generateSecret);
router.post('/verify', (0, validate_1.validateBody)(verifyMFASchema), controller.verifyToken);
router.post('/enable', (0, validate_1.validateBody)(enableMFASchema), controller.enableMFA);
router.post('/disable', (0, validate_1.validateBody)(disableMFASchema), controller.disableMFA);
router.post('/sms/generate', (0, validate_1.validateBody)(generateSMSSchema), controller.generateSMSCode);
router.post('/sms/verify', (0, validate_1.validateBody)(verifySMSSchema), controller.verifySMSCode);
router.post('/email/send', (0, validate_1.validateBody)(sendEmailSchema), controller.sendEmailVerificationCode);
router.post('/email/verify', (0, validate_1.validateBody)(verifyEmailSchema), controller.verifyEmailCode);
router.post('/recovery/generate', (0, validate_1.validateBody)(generateRecoverySchema), controller.generateRecoveryCodes);
router.post('/recovery/verify', (0, validate_1.validateBody)(verifyRecoverySchema), controller.verifyRecoveryCode);
router.get('/status/:userId', controller.getMFAStatus);
exports.default = router;
