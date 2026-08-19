import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Repairing existing corporate invoices with missing corporateAccountId...");

  const invoices = await prisma.invoice.findMany({
    where: {
      corporateAccountId: null,
      invoiceType: 'CorporateInvoice',
      isDeleted: false,
    },
  });

  console.log(`Found ${invoices.length} corporate invoices with missing corporateAccountId.`);

  let updatedCount = 0;

  for (const inv of invoices) {
    if (!inv.enrollmentId) continue;

    const corpEnrollment = await prisma.corporateEnrollment.findFirst({
      where: { enrollmentId: inv.enrollmentId, isDeleted: false },
    });

    if (corpEnrollment) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          corporateAccountId: corpEnrollment.corporateAccountId,
        },
      });

      console.log(`✓ Updated Invoice #${inv.invoiceNumber} -> Linked to Corporate Account: ${corpEnrollment.corporateAccountId}`);
      updatedCount++;
    }
  }

  console.log(`🎉 Repair complete. Updated ${updatedCount} corporate invoice links.`);
}

main()
  .catch((err) => {
    console.error("❌ Repair failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
