/*
  Warnings:

  - You are about to drop the column `discountCode` on the `course_discounts` table. All the data in the column will be lost.
  - You are about to drop the column `appliedDiscountCodes` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the `finance_corporate_credit_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_installment_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_installments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_invoice_line_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_payment_allocations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_receipts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_receivables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_refunds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "finance_corporate_credit_rules" DROP CONSTRAINT "finance_corporate_credit_rules_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_corporate_credit_rules" DROP CONSTRAINT "finance_corporate_credit_rules_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "finance_installment_plans" DROP CONSTRAINT "finance_installment_plans_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_installment_plans" DROP CONSTRAINT "finance_installment_plans_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_installment_plans" DROP CONSTRAINT "finance_installment_plans_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "finance_installments" DROP CONSTRAINT "finance_installments_installmentPlanId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoice_line_items" DROP CONSTRAINT "finance_invoice_line_items_courseId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoice_line_items" DROP CONSTRAINT "finance_invoice_line_items_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoice_line_items" DROP CONSTRAINT "finance_invoice_line_items_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoice_line_items" DROP CONSTRAINT "finance_invoice_line_items_sourceBranchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoices" DROP CONSTRAINT "finance_invoices_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoices" DROP CONSTRAINT "finance_invoices_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoices" DROP CONSTRAINT "finance_invoices_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_invoices" DROP CONSTRAINT "finance_invoices_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payment_allocations" DROP CONSTRAINT "finance_payment_allocations_installmentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payment_allocations" DROP CONSTRAINT "finance_payment_allocations_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payments" DROP CONSTRAINT "finance_payments_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payments" DROP CONSTRAINT "finance_payments_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payments" DROP CONSTRAINT "finance_payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "finance_payments" DROP CONSTRAINT "finance_payments_receivedBy_fkey";

-- DropForeignKey
ALTER TABLE "finance_payments" DROP CONSTRAINT "finance_payments_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "finance_receipts" DROP CONSTRAINT "finance_receipts_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_receipts" DROP CONSTRAINT "finance_receipts_issuedBy_fkey";

-- DropForeignKey
ALTER TABLE "finance_receipts" DROP CONSTRAINT "finance_receipts_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_receivables" DROP CONSTRAINT "finance_receivables_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_receivables" DROP CONSTRAINT "finance_receivables_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "finance_refunds" DROP CONSTRAINT "finance_refunds_branchId_fkey";

-- DropForeignKey
ALTER TABLE "finance_refunds" DROP CONSTRAINT "finance_refunds_decidedBy_fkey";

-- DropForeignKey
ALTER TABLE "finance_refunds" DROP CONSTRAINT "finance_refunds_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "finance_refunds" DROP CONSTRAINT "finance_refunds_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "finance_refunds" DROP CONSTRAINT "finance_refunds_requestedBy_fkey";

-- DropForeignKey
ALTER TABLE "trainer_compensation_rates" DROP CONSTRAINT "trainer_compensation_rates_batchId_fkey";

-- DropForeignKey
ALTER TABLE "trainer_compensation_rates" DROP CONSTRAINT "trainer_compensation_rates_sessionId_fkey";

-- DropIndex
DROP INDEX "course_discounts_discountCode_idx";

-- AlterTable
ALTER TABLE "course_discounts" DROP COLUMN "discountCode";

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "appliedDiscountCodes";

-- AlterTable
ALTER TABLE "trainer_availability" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trainer_compensation_rates" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trainer_course_authorizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trainer_profiles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trainer_qualifications" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "finance_corporate_credit_rules";

-- DropTable
DROP TABLE "finance_installment_plans";

-- DropTable
DROP TABLE "finance_installments";

-- DropTable
DROP TABLE "finance_invoice_line_items";

-- DropTable
DROP TABLE "finance_invoices";

-- DropTable
DROP TABLE "finance_payment_allocations";

-- DropTable
DROP TABLE "finance_payments";

-- DropTable
DROP TABLE "finance_receipts";

-- DropTable
DROP TABLE "finance_receivables";

-- DropTable
DROP TABLE "finance_refunds";

-- DropEnum
DROP TYPE "AgingBucket";

-- DropEnum
DROP TYPE "CorporateCreditRuleStatus";

-- DropEnum
DROP TYPE "InstallmentPlanStatus";

-- DropEnum
DROP TYPE "InstallmentStatus";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "InvoiceType";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ReceivableStatus";

-- DropEnum
DROP TYPE "RefundStatus";

-- DropEnum
DROP TYPE "RefundType";

-- AddForeignKey
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_compensation_rates" ADD CONSTRAINT "trainer_compensation_rates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_compensation_rates" ADD CONSTRAINT "trainer_compensation_rates_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
