-- AlterTable
ALTER TABLE "course_discounts" ADD COLUMN     "discountCode" VARCHAR(50);

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "appliedDiscountCodes" VARCHAR(500);

-- CreateIndex
CREATE INDEX "course_discounts_discountCode_idx" ON "course_discounts"("discountCode");
