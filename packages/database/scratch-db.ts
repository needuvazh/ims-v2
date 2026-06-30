import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        branchName: true,
        parentBranchId: true,
      }
    });
    console.log('Branches in db:', branches);
  } catch (error: any) {
    console.error('An error occurred during DB operation:', error);
  }
}
main().catch((err) => {
  console.error('Outer error:', err);
}).finally(() => prisma.$disconnect());


