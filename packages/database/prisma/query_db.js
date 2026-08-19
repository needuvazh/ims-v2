import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const contracts = await prisma.corporateContract.findMany();
  console.log("CONTRACTS:", JSON.stringify(contracts, null, 2));

  const batches = await prisma.batch.findMany();
  console.log("BATCHES:", JSON.stringify(batches.map(b => ({
    id: b.id,
    batchCode: b.batchCode,
    batchNameEnglish: b.batchNameEnglish,
    status: b.status,
    isDeleted: b.isDeleted
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
