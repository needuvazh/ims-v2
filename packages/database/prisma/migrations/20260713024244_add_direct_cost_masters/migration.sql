-- AlterTable
ALTER TABLE "quotation_costing_sheets" ALTER COLUMN "trainerCost" DROP NOT NULL,
ALTER COLUMN "venueCost" DROP NOT NULL,
ALTER COLUMN "equipmentCost" DROP NOT NULL,
ALTER COLUMN "printingCost" DROP NOT NULL,
ALTER COLUMN "certificateCost" DROP NOT NULL,
ALTER COLUMN "travelCost" DROP NOT NULL,
ALTER COLUMN "accommodationCost" DROP NOT NULL,
ALTER COLUMN "foodCost" DROP NOT NULL,
ALTER COLUMN "vehicleCost" DROP NOT NULL,
ALTER COLUMN "administrationCost" DROP NOT NULL,
ALTER COLUMN "marketingCost" DROP NOT NULL,
ALTER COLUMN "miscellaneousCost" DROP NOT NULL;

-- CreateTable
CREATE TABLE "direct_cost_element_masters" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "direct_cost_element_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_direct_cost_items" (
    "id" UUID NOT NULL,
    "costingSheetId" UUID NOT NULL,
    "costElementId" UUID NOT NULL,
    "amount" DECIMAL(18,3) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "quotation_direct_cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_cost_element_masters_name_key" ON "direct_cost_element_masters"("name");

-- CreateIndex
CREATE INDEX "quotation_direct_cost_items_costingSheetId_idx" ON "quotation_direct_cost_items"("costingSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_direct_cost_items_costingSheetId_costElementId_key" ON "quotation_direct_cost_items"("costingSheetId", "costElementId");

-- AddForeignKey
ALTER TABLE "quotation_direct_cost_items" ADD CONSTRAINT "quotation_direct_cost_items_costingSheetId_fkey" FOREIGN KEY ("costingSheetId") REFERENCES "quotation_costing_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_direct_cost_items" ADD CONSTRAINT "quotation_direct_cost_items_costElementId_fkey" FOREIGN KEY ("costElementId") REFERENCES "direct_cost_element_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
