import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { validateBody } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schema';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const service = new AuthService();
const controller = new AuthController(service);

router.post('/login', validateBody(loginSchema), controller.login);
router.post('/register', validateBody(registerSchema), controller.register);
router.get('/me', authMiddleware, controller.me);
router.post('/logout', authMiddleware, controller.logout);

export default router;
