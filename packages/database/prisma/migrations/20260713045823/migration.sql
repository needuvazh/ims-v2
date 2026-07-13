/*
  Warnings:

  - You are about to drop the `corporate_marketing_visits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corporate_sales_follow_ups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `corporate_sales_leads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `direct_cost_element_masters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_costing_sheets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_direct_cost_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_line_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotation_revisions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sales_orders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "corporate_marketing_visits" DROP CONSTRAINT "corporate_marketing_visits_branchId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_marketing_visits" DROP CONSTRAINT "corporate_marketing_visits_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_marketing_visits" DROP CONSTRAINT "corporate_marketing_visits_corporateSalesLeadId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_sales_follow_ups" DROP CONSTRAINT "corporate_sales_follow_ups_branchId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_sales_follow_ups" DROP CONSTRAINT "corporate_sales_follow_ups_corporateSalesLeadId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_sales_leads" DROP CONSTRAINT "corporate_sales_leads_branchId_fkey";

-- DropForeignKey
ALTER TABLE "corporate_sales_leads" DROP CONSTRAINT "corporate_sales_leads_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_costing_sheets" DROP CONSTRAINT "quotation_costing_sheets_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_direct_cost_items" DROP CONSTRAINT "quotation_direct_cost_items_costElementId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_direct_cost_items" DROP CONSTRAINT "quotation_direct_cost_items_costingSheetId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_line_items" DROP CONSTRAINT "quotation_line_items_courseId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_line_items" DROP CONSTRAINT "quotation_line_items_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "quotation_revisions" DROP CONSTRAINT "quotation_revisions_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_branchId_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_corporateSalesLeadId_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_branchId_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_quotationId_fkey";

-- DropTable
DROP TABLE "corporate_marketing_visits";

-- DropTable
DROP TABLE "corporate_sales_follow_ups";

-- DropTable
DROP TABLE "corporate_sales_leads";

-- DropTable
DROP TABLE "direct_cost_element_masters";

-- DropTable
DROP TABLE "quotation_costing_sheets";

-- DropTable
DROP TABLE "quotation_direct_cost_items";

-- DropTable
DROP TABLE "quotation_line_items";

-- DropTable
DROP TABLE "quotation_revisions";

-- DropTable
DROP TABLE "quotations";

-- DropTable
DROP TABLE "sales_orders";
