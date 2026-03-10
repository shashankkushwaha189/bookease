import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

// Security & Optimization
app.use(helmet());
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'https://bookease-ashen.vercel.app',
    'https://yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Tenant-Slug']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

// Simple database initialization endpoint
app.post('/api/init-database', async (req, res) => {
  try {
    console.log('🌱 Initializing database...');
    
    // Import prisma dynamically to avoid connection issues on startup
    const { prisma } = await import('./lib/prisma');
    
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
    try {
      const { prisma } = await import('./lib/prisma');
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
});

// Simple business profile endpoint
app.get('/api/business-profile/public/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Import prisma dynamically
    const { prisma } = await import('./lib/prisma');
    
    await prisma.$connect();
    
    const tenant = await prisma.tenant.findFirst({
      where: { slug, isActive: true },
      include: {
        businessProfile: true
      }
    });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BUSINESS_PROFILE_NOT_FOUND',
          message: 'Business profile not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        businessProfile: tenant.businessProfile
      }
    });
    
  } catch (error) {
    console.error('Business profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch business profile'
      }
    });
  } finally {
    try {
      const { prisma } = await import('./lib/prisma');
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An unexpected error occurred',
        },
    });
});

module.exports = app;
