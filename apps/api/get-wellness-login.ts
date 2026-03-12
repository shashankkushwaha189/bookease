import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { Option: 'b2934b40-378c-4736-82d1-b56a1d905858' },
    select: { email: true, role: true, tenantId: true }
  });
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
