import { Router } from 'express';
import { execSync } from 'child_process';
import { prisma } from '../lib/prisma';

const router = Router();

// Run migrations endpoint (temporary - remove after use)
router.post('/run-migrations', async (req, res) => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Test database connection first
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Run Prisma migrate deploy
    console.log('📦 Deploying migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Run Prisma seed
    console.log('🌱 Seeding database...');
    execSync('npx prisma db seed', { stdio: 'inherit' });
    
    // Verify database is working
    const tenantCount = await prisma.tenant.count();
    console.log(`✅ Database ready! Found ${tenantCount} tenants`);
    
    res.json({ 
      success: true, 
      message: 'Migrations completed successfully',
      tenantCount: tenantCount
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
});

// Check database status
router.get('/status', async (req, res) => {
  try {
    await prisma.$connect();
    const tenantCount = await prisma.tenant.count();
    const profileCount = await prisma.businessProfile.count();
    
    res.json({
      success: true,
      connected: true,
      tenantCount,
      profileCount,
      message: 'Database is ready'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;
