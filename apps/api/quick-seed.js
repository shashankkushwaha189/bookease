const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function quickSeed() {
  console.log('🌱 Quick seeding database...');
  
  try {
    // Create demo tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'demo-clinic' },
      update: {},
      create: {
        name: 'HealthFirst Clinic',
        slug: 'demo-clinic',
        timezone: 'Asia/Kolkata',
      }
    });
    
    console.log(`✅ Tenant: ${tenant.name}`);
    
    // Create demo admin user
    const passwordHash = await bcrypt.hash('demo123456', 10);
    
    const admin = await prisma.user.upsert({
      where: { 
        tenantId_email: {
          tenantId: tenant.id,
          email: 'admin@demo.com'
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@demo.com',
        passwordHash,
        role: 'ADMIN',
      }
    });
    
    console.log(`✅ Admin user: ${admin.email}`);
    
    // Create demo staff user
    const staff = await prisma.user.upsert({
      where: { 
        tenantId_email: {
          tenantId: tenant.id,
          email: 'staff@demo.com'
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'staff@demo.com',
        passwordHash,
        role: 'STAFF',
      }
    });
    
    console.log(`✅ Staff user: ${staff.email}`);
    
    console.log('🎉 Quick seed completed!');
    
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickSeed();
