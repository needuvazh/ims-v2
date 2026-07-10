/*
  Warnings:

  - You are about to drop the column `branchId` on the `admissions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_branchId_fkey";

-- DropIndex
DROP INDEX "admissions_branchId_idx";

-- AlterTable
ALTER TABLE "admissions" DROP COLUMN "branchId";

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "leadId" UUID;

-- CreateIndex
CREATE INDEX "enrollments_leadId_idx" ON "enrollments"("leadId");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
