import { Router } from 'express';
import { SessionController } from './session.controller';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
const controller = new SessionController();

// Validation schemas
const createSessionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  deviceId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const getSessionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const updateSessionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const deleteSessionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const getUserSessionsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  limit: z.string().transform(val => parseInt(val)).optional(),
});

const deleteAllSessionsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

const getAnalyticsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// Session routes
router.post('/', validateBody(createSessionSchema), controller.createSession);
router.get('/:token', validateBody(getSessionSchema), controller.getSession);
router.get('/user/:userId', validateBody(getUserSessionsSchema), controller.getUserSessions);
router.put('/:token', validateBody(updateSessionSchema), controller.updateSession);
router.delete('/:token', validateBody(deleteSessionSchema), controller.deleteSession);
router.delete('/user/:userId', validateBody(deleteAllSessionsSchema), controller.deleteUserSessions);
router.get('/analytics/:userId', validateBody(getAnalyticsSchema), controller.getSessionAnalytics);
router.post('/cleanup', controller.cleanExpiredSessions);

export default router;
