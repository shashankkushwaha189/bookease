import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Simple setup endpoint for database initialization
router.post('/init', async (req, res) => {
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

export default router;
