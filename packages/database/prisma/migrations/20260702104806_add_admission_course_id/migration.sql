-- AlterTable
ALTER TABLE "admissions" ADD COLUMN     "courseId" UUID;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
