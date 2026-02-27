const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function test() {
  console.log('--- Database Verification Test ---');
  
  try {
    // 1. Create a Tenant
    console.log('Creating a test tenant...');
    const newTenant = await prisma.tenant.create({
      data: {
        name: 'Test Business',
      },
    });
    console.log('✅ Created:', newTenant);

    // 2. Read the Tenant
    console.log('Fetching the tenant...');
    const fetchedTenant = await prisma.tenant.findUnique({
      where: { id: newTenant.id },
    });
    
    if (fetchedTenant && fetchedTenant.name === 'Test Business') {
      console.log('✅ Verified: Data matches');
    } else {
      throw new Error('❌ Verification failed: Data mismatch or not found');
    }

    // 3. Cleanup
    console.log('Cleaning up...');
    await prisma.tenant.delete({
      where: { id: newTenant.id },
    });
    console.log('✅ Cleanup complete');

    console.log('\n--- All Database Tests Passed! ---');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
