import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { errorHandler } from './middleware/error-handler';
import { tenantMiddleware } from './middleware/tenant.middleware';
import tenantRoutes from './modules/tenant/tenant.routes';
import businessProfileRoutes from './modules/business-profile/business-profile.routes';
import authRoutes from './modules/auth/auth.routes';
import bookingRoutes from './modules/booking/booking.routes';

const app = express();

// Security & Optimization
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(compression());
app.use(express.json());

// Request Tracking
app.use(correlationIdMiddleware);

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please try again later.',
        },
    },
});
app.use(limiter);

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// API Routes
app.use(tenantMiddleware);
app.use('/api/tenants', tenantRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/public/profile', businessProfileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public/bookings', bookingRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
});

// Error Handling (Must be last)
app.use(errorHandler);

export { app };
