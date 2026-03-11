import { Router } from 'express';
import { MFAController } from './mfa.controller';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';
import { MFAService } from './mfa.service';
import { prisma } from '../../lib/prisma';

const router = Router();
const mfaService = new MFAService(prisma);
const controller = new MFAController(mfaService);

// Validation schemas
const enableMFASchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token is required'),
  secret: z.string().optional(),
});

const verifyMFASchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token is required'),
  code: z.string().min(4, 'Code must be at least 4 characters'),
});

const disableMFASchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token is required'),
});

const generateSMSSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
});

const verifySMSSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().min(4, 'Code must be at least 4 characters'),
});

const sendEmailSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email format'),
});

const verifyEmailSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().min(3, 'Code must be at least 3 characters'),
});

const generateRecoverySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const verifyRecoverySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().min(4, 'Code must be at least 4 characters'),
});

// MFA routes
router.post('/setup', validateBody(enableMFASchema), controller.generateSecret);
router.post('/verify', validateBody(verifyMFASchema), controller.verifyToken);
router.post('/enable', validateBody(enableMFASchema), controller.enableMFA);
router.post('/disable', validateBody(disableMFASchema), controller.disableMFA);
router.post('/sms/generate', validateBody(generateSMSSchema), controller.generateSMSCode);
router.post('/sms/verify', validateBody(verifySMSSchema), controller.verifySMSCode);
router.post('/email/send', validateBody(sendEmailSchema), controller.sendEmailVerificationCode);
router.post('/email/verify', validateBody(verifyEmailSchema), controller.verifyEmailCode);
router.post('/recovery/generate', validateBody(generateRecoverySchema), controller.generateRecoveryCodes);
router.post('/recovery/verify', validateBody(verifyRecoverySchema), controller.verifyRecoveryCode);
router.get('/status/:userId', controller.getMFAStatus);

export default router;
