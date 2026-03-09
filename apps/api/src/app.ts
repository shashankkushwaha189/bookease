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
import userRoutes from './modules/user/user.routes';
import mfaRoutes from './modules/auth/mfa.routes';
import sessionRoutes from './modules/auth/session.routes';
import configRoutes from './modules/config/config.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import serviceRoutes from './modules/service/service.routes';
import staffRoutes from './modules/staff/staff.routes';
import { appointmentRouter } from './modules/appointment/appointment.routes';
// import { aiRoutes } from './modules/ai_disabled/ai.routes';
import auditRoutes from './modules/audit/audit.routes';
import reportRoutes from './modules/report/report.routes';
import archiveRoutes from './modules/archival/archive.routes';
import apiTokenRoutes from './modules/api-token/api-token.routes';
import policyRoutes from './modules/policy/policy.routes';
import customerRoutes from './modules/customer/customer.routes'; // Re-enabled
import importRoutes from './modules/import/import.routes'; // Re-enabled
import publicBookingRoutes from './modules/appointment/public-booking.routes';

const app = express();

// Security & Optimization
app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://bookease-ashen.vercel.app',
    'https://yourdomain.com' // Replace with your actual domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Tenant-Slug']
}));
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
    '/api/config',
    '/api/audit',
    '/api/auth',
    '/api/reports',
    '/api/customers', // Re-enabled
    '/api/import', // Re-enabled
    '/api/tokens',
];

const publicRoutes = [
    '/api/tenants',
    '/api/public/services',
    '/api/public/staff',
    '/api/public/availability',
    '/api/public/bookings',
    '/api/public/profile',
    '/api/business-profile/public',
    '/api/users', // User authentication routes
    '/api/auth', // User authentication routes
];

app.use(protectedRoutes, tenantMiddleware);

// API Routes - Public routes first (no auth required)
app.use('/api/tenants', tenantRoutes);
app.use('/api/public/services', serviceRoutes);
app.use('/api/public/staff', staffRoutes);
app.use('/api/public/availability', availabilityRoutes);
app.use('/api/public/bookings', publicBookingRoutes);
app.use('/api/public/profile', businessProfileRoutes);
app.use('/api/business-profile/public', businessProfileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/config', configRoutes);
// Apply tenant middleware to protected routes only
app.use(protectedRoutes, tenantMiddleware);
app.use('/api/availability', availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRouter);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/customers', customerRoutes); // Re-enabled
app.use('/api/import', importRoutes); // Re-enabled
app.use('/api/tokens', apiTokenRoutes);
app.use('/api/policy', policyRoutes);
// Protected business profile routes (require tenant middleware)
app.use('/api/business-profile', businessProfileRoutes);


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
