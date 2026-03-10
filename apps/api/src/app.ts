import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { errorHandler } from './middleware/error-handler';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { prisma } from './lib/prisma';
import tenantRoutes from './modules/tenant/tenant.routes';
import businessProfileRoutes from './modules/business-profile/business-profile.routes';
import userRoutes from './modules/user/user.routes';
import mfaRoutes from './modules/auth/mfa.routes';
import sessionRoutes from './modules/auth/session.routes';
import configRoutes from './modules/config/config.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import { router as serviceRoutes, publicRouter as publicServiceRoutes } from './modules/service/service.routes';
import { router as staffRoutes, publicRouter as publicStaffRoutes } from './modules/staff/staff.routes';
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
import migrateRoutes from './routes/migrate';
import seedRoutes from './routes/seed';
import setupRoutes from './routes/setup';

const app = express();

// Security & Optimization
app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5174',
    'http://127.0.0.1:62362',
    'https://127.0.0.1:62362',
    'http://127.0.0.1:62361',
    'https://127.0.0.1:62361',
    'https://bookease-ashen.vercel.app',
    'https://yourdomain.com' // Replace with your actual domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Tenant-Slug', 'x-correlation-id']
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

// API Routes - Public routes first (no auth required)
app.use('/api/tenants', tenantRoutes);
app.use('/api/public/services', publicServiceRoutes);
app.use('/api/public/staff', publicStaffRoutes);
app.use('/api/public/availability', availabilityRoutes);
app.use('/api/public/bookings', publicBookingRoutes);
app.use('/api/public/profile', businessProfileRoutes);
app.use('/api/business-profile/public', businessProfileRoutes);
app.use('/api/customers', customerRoutes);

app.use(protectedRoutes, tenantMiddleware);

app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/config', configRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/setup', setupRoutes);
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

// Simple database initialization endpoint
app.post('/api/init-database', async (req, res) => {
  try {
    console.log('🌱 Initializing database...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Check if tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-clinic' }
    });
    
    if (existingTenant) {
      console.log('✅ Demo tenant already exists');
      return res.json({ 
        success: true, 
        message: 'Database already initialized',
        tenantId: existingTenant.id,
        tenantSlug: existingTenant.slug
      });
    }
    
    // Create demo tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'HealthFirst Clinic',
        slug: 'demo-clinic',
        domain: 'demo-clinic.bookease.com',
        timezone: 'UTC',
        isActive: true
      }
    });
    
    console.log('✅ Created tenant:', tenant.name);
    
    // Create business profile
    const profile = await prisma.businessProfile.create({
      data: {
        tenantId: tenant.id,
        businessName: 'HealthFirst Clinic',
        brandColor: '#1A56DB',
        accentColor: '#7C3AED'
      }
    });
    
    console.log('✅ Created business profile:', profile.businessName);
    
    res.json({ 
      success: true, 
      message: 'Database initialized successfully',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: profile.businessName
    });
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
});


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
