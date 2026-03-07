import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const tenantCount = await prisma.tenant.count();
    console.log(`✅ Found ${tenantCount} tenants`);
    
    await prisma.$disconnect();
    return { success: true, tenantCount };
  } catch (error: any) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConnection();
}
