import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Prisma keys:', Object.keys(prisma));
    console.log('staff property:', !!(prisma as any).staff);
    console.log('staffBreak property:', !!(prisma as any).staffBreak);
    console.log('weeklySchedule property:', !!(prisma as any).weeklySchedule);

    const models = Object.keys(prisma).filter(k => !k.startsWith('$'));
    console.log('Detected models in client:', models);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
