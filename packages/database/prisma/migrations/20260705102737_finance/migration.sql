/*
  Warnings:

  - Added the required column `category` to the `finance_invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subCategory` to the `finance_invoices` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceCategory" AS ENUM ('Student', 'Corporate');

-- CreateEnum
CREATE TYPE "InvoiceSubCategory" AS ENUM ('FullPayment', 'Advance', 'PartialPayment', 'Installment');

-- DropForeignKey
ALTER TABLE "finance_installment_plans" DROP CONSTRAINT "finance_installment_plans_enrollmentId_fkey";

-- AlterTable
ALTER TABLE "finance_installment_plans" ALTER COLUMN "enrollmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "finance_invoices" ADD COLUMN     "category" "InvoiceCategory" NOT NULL,
ADD COLUMN     "subCategory" "InvoiceSubCategory" NOT NULL;

-- AddForeignKey
ALTER TABLE "finance_installment_plans" ADD CONSTRAINT "finance_installment_plans_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
