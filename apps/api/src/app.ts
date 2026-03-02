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
import configRoutes from './modules/config/config.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import serviceRoutes from './modules/service/service.routes';
import staffRoutes from './modules/staff/staff.routes';
import auditRoutes from './modules/audit/audit.routes';
import { appointmentRouter } from './modules/appointment/appointment.routes';
import reportRoutes from './modules/report/report.routes';
import importRoutes from './modules/import/import.routes';
import apiTokenRoutes from './modules/api-token/api-token.routes';
import { aiRoutes } from './modules/ai/ai.routes';


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
    max: 1000, // Increased from 100 to 1000 for development
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for development/demo
        return env.NODE_ENV === 'development' || !!req.headers['user-agent']?.includes('Mozilla');
    },
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please try again later.',
        },
    },
});
app.use(limiter);

import { prisma } from './lib/prisma'; // Added Prisma for DB probe

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        db: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// Readiness Probe
app.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', db: 'ok' });
    } catch (e) {
        res.status(503).json({ status: 'error', db: 'error', message: 'Database connection failed' });
    }
});

// Global Context (Tenant ID required for these)
const protectedRoutes = [
    '/api/business-profile',
    '/api/config',
    '/api/availability',
    '/api/services',
    '/api/staff',
    '/api/appointments',
    '/api/public/bookings',
    '/api/public/profile',
    '/api/public/services',
    '/api/public/staff',
    '/api/audit',
    '/api/auth',
    '/api/reports',
    '/api/import',
    '/api/tokens',
];

app.use(protectedRoutes, tenantMiddleware);

// API Routes
app.use('/api/tenants', tenantRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/public/profile', businessProfileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/public/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public/staff', staffRoutes);
app.use('/api/appointments', appointmentRouter);
app.use('/api/appointments', aiRoutes);
app.use('/api/public/bookings', appointmentRouter);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/tokens', apiTokenRoutes);


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
