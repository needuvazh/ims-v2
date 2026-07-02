/*
  Warnings:

  - The `status` column on the `course_completion_rules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `course_discounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `course_pricings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ConfigStatus" AS ENUM ('Draft', 'Active', 'Inactive', 'Superseded');

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "batchType" VARCHAR(50) NOT NULL DEFAULT 'Regular';

-- AlterTable
ALTER TABLE "course_completion_rules" DROP COLUMN "status",
ADD COLUMN     "status" "ConfigStatus" NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "course_discounts" DROP COLUMN "status",
ADD COLUMN     "status" "ConfigStatus" NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "course_pricings" ADD COLUMN     "isTaxExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxExemptionCode" VARCHAR(100),
ADD COLUMN     "taxExemptionReason" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ConfigStatus" NOT NULL DEFAULT 'Active';

-- CreateIndex
CREATE INDEX "course_pricings_courseId_branchId_customerType_batchType_st_idx" ON "course_pricings"("courseId", "branchId", "customerType", "batchType", "status");

-- CreateIndex
CREATE INDEX "course_pricings_courseId_batchId_customerType_batchType_sta_idx" ON "course_pricings"("courseId", "batchId", "customerType", "batchType", "status");
