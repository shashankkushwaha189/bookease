import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenants() {
  try {
    console.log('🔍 Checking existing tenants...');
    
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(tenant => {
      console.log(`  - ID: ${tenant.id}`);
      console.log(`    Name: ${tenant.name}`);
      console.log(`    Slug: ${tenant.slug}`);
      console.log(`    Active: ${tenant.isActive}`);
      console.log(`    Created: ${tenant.createdAt}`);
      console.log('');
    });

    // Check specifically for healthfirst-demo
    const healthFirstDemo = tenants.find(t => t.slug === 'healthfirst-demo');
    if (healthFirstDemo) {
      console.log('✅ Found healthfirst-demo tenant');
    } else {
      console.log('❌ healthfirst-demo tenant NOT found');
      console.log('Available slugs:', tenants.map(t => t.slug));
    }

  } catch (error) {
    console.error('Error checking tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
