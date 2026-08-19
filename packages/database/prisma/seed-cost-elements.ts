import { PrismaClient } from '@prisma/client';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const prisma = new PrismaClient();

const costElements = [
  { name: 'Trainer Fees', status: 'Active' },
  { name: 'Training Materials & Printing', status: 'Active' },
  { name: 'Catering & Refreshments', status: 'Active' },
  { name: 'Venue & Classroom Rental', status: 'Active' },
  { name: 'Lab & Equipment Setup', status: 'Active' },
  { name: 'Software Licenses & Subscriptions', status: 'Active' },
  { name: 'Logistics & Transport', status: 'Active' },
  { name: 'Certificates & Accreditation', status: 'Active' },
  { name: 'Marketing & Sales Commission', status: 'Active' },
  { name: 'Administrative Overhead', status: 'Active' }
];

async function main() {
  console.log("🌱 Seeding/Upserting Direct Cost Elements into master database...");

  let seededCount = 0;

  for (const element of costElements) {
    const record = await prisma.directCostElementMaster.upsert({
      where: { name: element.name },
      update: {
        status: element.status,
      },
      create: {
        id: crypto.randomUUID(),
        name: element.name,
        status: element.status,
      },
    });
    console.log(`✓ Seeded/Upserted Direct Cost Element: ${record.name} (${record.status})`);
    seededCount++;
  }

  console.log(`🎉 Seeding complete. Processed ${seededCount} Direct Cost Elements.`);
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
