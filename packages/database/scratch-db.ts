import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.session.findMany({
      where: { isDeleted: false }
    });
    console.log(`Found ${sessions.length} sessions in total:`);
    for (const s of sessions) {
      console.log(`Session ID: ${s.id}, Batch ID: ${s.batchId}, Title: ${s.titleEnglish}, Trainer ID: ${s.trainerId}, Date: ${s.sessionDate}, Start: ${s.startTime}, End: ${s.endTime}`);
    }
  } catch (error: any) {
    console.error('An error occurred:', error);
  }
}
main()
  .catch((err) => {
    console.error('Outer error:', err);
  })
  .finally(() => prisma.$disconnect());
