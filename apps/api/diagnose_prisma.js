const { PrismaClient } = require('@prisma/client');
const { env } = require('./src/config/env');

async function main() {
  console.log('ENV DATABASE_URL:', env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
  try {
    const prisma = new PrismaClient({
      datasourceUrl: env.DATABASE_URL
    });
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    await prisma.$disconnect();
  } catch (err) {
    console.error('❌ Prisma connection failed:', err);
    process.exit(1);
  }
}

main();
