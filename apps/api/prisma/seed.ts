import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Seeding database...');
    // Placeholder for future seeding logic
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
