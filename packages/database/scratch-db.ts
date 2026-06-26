import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const institutes = await prisma.institute.findMany();
  console.log(institutes);
}
main().catch(console.error).finally(() => prisma.$disconnect());
