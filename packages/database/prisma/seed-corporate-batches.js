import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding active test Batches for courses...");

  const muscatBranch = await prisma.branch.findFirst({
    where: { branchCode: 'AST-MUSCAT' },
  });

  if (!muscatBranch) {
    console.error("❌ AST-MUSCAT branch not found. Make sure the database is seeded first.");
    process.exit(1);
  }

  const courses = await prisma.course.findMany({
    where: { isDeleted: false, status: 'Published' },
  });

  console.log(`Found ${courses.length} published courses.`);

  let batchCount = 0;

  for (const course of courses) {
    const existing = await prisma.batch.findFirst({
      where: {
        courseId: course.id,
        branchId: muscatBranch.id,
        isDeleted: false,
      },
    });

    if (!existing) {
      const batchCode = `${course.courseCode}-B01`;
      const batchNameEnglish = `${course.nameEnglish} Batch 1`;

      await prisma.batch.create({
        data: {
          id: crypto.randomUUID(),
          courseId: course.id,
          branchId: muscatBranch.id,
          batchCode,
          batchNameEnglish,
          batchNameArabic: course.nameArabic || null,
          status: 'Active',
          capacity: 20,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
        },
      });

      console.log(`✓ Created Active Batch: ${batchNameEnglish} (${batchCode})`);
      batchCount++;
    } else {
      console.log(`- Batch already exists for course: ${course.nameEnglish}`);
    }
  }

  console.log(`🎉 Seeding complete. Created ${batchCount} active Batches.`);
}

main()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
