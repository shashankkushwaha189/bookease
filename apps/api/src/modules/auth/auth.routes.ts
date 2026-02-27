import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { validateBody } from '../../middleware/validate';
import { loginSchema } from './auth.schema';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const service = new AuthService();
const controller = new AuthController(service);

// Security: Rate limit login attempts
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per window
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts. Please try again after 15 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', loginRateLimiter, validateBody(loginSchema), controller.login);
router.get('/me', authMiddleware, controller.me);
router.post('/logout', authMiddleware, controller.logout);

export default router;
