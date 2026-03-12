import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth.middleware';
import { requireRole } from './middleware/role.middleware';
import { tenantMiddleware } from './middleware/tenant.middleware';
import { prisma } from './lib/prisma';
import tenantRoutes from './modules/tenant/tenant.routes';
import businessProfileRoutes from './modules/business-profile/business-profile.routes';
import authRoutes from './modules/auth/auth.routes';
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
import bookingRoutes from './modules/booking/booking.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import migrateRoutes from './routes/migrate';
import seedRoutes from './routes/seed';
import setupRoutes from './routes/setup';
import userRoutes from './modules/user/user.routes';

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
    '/api/business-profile',
    '/api/config',
    '/api/audit',
    '/api/auth',
    '/api/reports',
    '/api/customers', // Re-enabled
    '/api/import', // Re-enabled
    '/api/tokens',
    '/api/notifications',
    // Public endpoints that still require tenant context
    '/api/public/profile',
];

const publicRoutes = [
    '/api/tenants',
    '/api/public/services',
    '/api/public/staff',
    '/api/public/availability',
    '/api/public/bookings',
    '/api/bookings', // New booking endpoint
    '/api/public/profile',
    '/api/business-profile/public',
    '/api/auth', // Auth routes (login/register) handled with tenantMiddleware exceptions
];

// API Routes - Public routes first (no auth required)
app.use('/api/tenants', tenantRoutes);
app.use('/api/public/services', publicServiceRoutes);
app.use('/api/public/staff', publicStaffRoutes);
app.use('/api/public/availability', availabilityRoutes);
app.use('/api/public/bookings', publicBookingRoutes);
app.use('/api/bookings', bookingRoutes);
// Public profile still requires tenant context (X-Tenant-ID)
app.use('/api/public/profile', tenantMiddleware, businessProfileRoutes);
app.use('/api/business-profile/public', tenantMiddleware, businessProfileRoutes);
app.use('/api/customers', tenantMiddleware, authMiddleware, customerRoutes);

app.use(protectedRoutes, tenantMiddleware);

// User management routes with role-based access
app.use('/api/users', tenantMiddleware, authMiddleware, userRoutes);

// Auth routes (tenant middleware applied with exceptions)
app.use('/api/auth', tenantMiddleware, authRoutes);
app.use('/api/mfa', tenantMiddleware, authMiddleware, mfaRoutes);
app.use('/api/sessions', tenantMiddleware, authMiddleware, sessionRoutes);
// Admin-only routes (require ADMIN role)
app.use('/api/config', tenantMiddleware, authMiddleware, requireRole('ADMIN'), configRoutes);
app.use('/api/migrate', tenantMiddleware, authMiddleware, requireRole('ADMIN'), migrateRoutes);
app.use('/api/seed', tenantMiddleware, authMiddleware, requireRole('ADMIN'), seedRoutes);
app.use('/api/setup', tenantMiddleware, authMiddleware, requireRole('ADMIN'), setupRoutes);
// Staff and Admin routes
app.use('/api/availability', tenantMiddleware, authMiddleware, requireRole('STAFF', 'ADMIN'), availabilityRoutes);
app.use('/api/services', tenantMiddleware, authMiddleware, requireRole('STAFF', 'ADMIN'), serviceRoutes);
app.use('/api/staff', tenantMiddleware, authMiddleware, requireRole('STAFF', 'ADMIN'), staffRoutes);
app.use('/api/appointments', tenantMiddleware, authMiddleware, requireRole('STAFF', 'ADMIN'), appointmentRouter);
app.use('/api/bookings', tenantMiddleware, authMiddleware, bookingRoutes);
app.use('/api/notifications', tenantMiddleware, authMiddleware, requireRole('STAFF', 'ADMIN'), notificationRoutes);
app.use('/api/audit', tenantMiddleware, authMiddleware, requireRole('ADMIN'), auditRoutes);
app.use('/api/reports', tenantMiddleware, authMiddleware, requireRole('ADMIN', 'STAFF'), reportRoutes);
app.use('/api/archive', tenantMiddleware, authMiddleware, requireRole('ADMIN'), archiveRoutes);
app.use('/api/tokens', tenantMiddleware, authMiddleware, requireRole('ADMIN'), apiTokenRoutes);
app.use('/api/policy', tenantMiddleware, authMiddleware, requireRole('ADMIN'), policyRoutes);

// Simple database initialization endpoint
app.post('/api/init-database', async (req, res) => {
  try {
    console.log('🌱 Initializing database...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    const { tenantSlug, tenantName, businessName, adminEmail, adminPassword } = req.body;
    
    // Use provided data or defaults
    const slug = tenantSlug || 'demo-clinic';
    const name = tenantName || 'HealthFirst Clinic';
    const bizName = businessName || 'HealthFirst Clinic';
    const email = adminEmail || 'admin@demo.com';
    const password = adminPassword || 'demo123456';
    
    // Check if tenant already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { slug }
    });
    
    if (existingTenant) {
      console.log('✅ Tenant already exists:', existingTenant.name);
      return res.json({ 
        success: true, 
        message: 'Tenant already exists',
        tenantId: existingTenant.id,
        tenantSlug: existingTenant.slug,
        businessName: existingTenant.name
      });
    }
    
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        domain: `${slug}.bookease.com`,
        timezone: 'UTC',
        isActive: true
      }
    });
    
    console.log('✅ Created tenant:', tenant.name);
    
    // Create business profile
    const profile = await prisma.businessProfile.create({
      data: {
        tenantId: tenant.id,
        businessName: bizName,
        brandColor: '#1A56DB',
        accentColor: '#7C3AED'
      }
    });
    
    console.log('✅ Created business profile:', profile.businessName);
    
    // Create admin user (without password hashing for simplicity - in production, use bcrypt)
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);
    
    const adminUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      }
    });
    
    console.log('✅ Created admin user:', adminUser.email);
    
    res.json({ 
      success: true, 
      message: 'Tenant initialized successfully',
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: profile.businessName,
      adminEmail: adminUser.email
    });
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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
