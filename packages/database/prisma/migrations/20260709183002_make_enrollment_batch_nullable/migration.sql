-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_batchId_fkey";

-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "batchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
