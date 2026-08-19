import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Resolving and seeding Corporate Course Pricing for existing courses...");

  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    include: {
      pricings: true,
    },
  });

  console.log(`Found ${courses.length} courses to inspect.`);

  let seededCount = 0;

  for (const course of courses) {
    const hasCorporate = course.pricings.some((p) => p.customerType === 'Corporate' && !p.isDeleted);

    if (!hasCorporate) {
      // Find base price of existing individual pricing to use as reference, or default to 150
      const individualPricing = course.pricings.find((p) => p.customerType === 'Individual' && !p.isDeleted);
      const individualBasePrice = individualPricing ? Number(individualPricing.basePrice) : 150.0;

      // Seed corporate price slightly discounted (e.g. 80% of individual price or 120)
      const corporateBasePrice = individualBasePrice > 0 ? Number((individualBasePrice * 0.8).toFixed(3)) : 120.0;

      await prisma.coursePricing.create({
        data: {
          id: crypto.randomUUID(),
          courseId: course.id,
          customerType: 'Corporate',
          batchType: 'Regular',
          basePrice: corporateBasePrice,
          effectiveStartDate: new Date(),
          status: 'Active',
        },
      });

      console.log(`✓ Seeded Corporate pricing for course: ${course.nameEnglish} (Code: ${course.courseCode}) at ${corporateBasePrice} OMR`);
      seededCount++;
    } else {
      console.log(`- Course ${course.nameEnglish} already has corporate pricing.`);
    }
  }

  console.log(`🎉 Seeding complete. Created ${seededCount} Corporate Course Pricing records.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
