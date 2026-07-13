-- CreateTable
CREATE TABLE "corporate_sales_leads" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "leadId" UUID,
    "salesOwnerId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "stage" VARCHAR(50) NOT NULL,
    "expectedValue" DECIMAL(18,3) NOT NULL,
    "expectedCloseDate" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_sales_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_marketing_visits" (
    "id" UUID NOT NULL,
    "corporateSalesLeadId" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "companyNameSnapshot" VARCHAR(255) NOT NULL,
    "contactPersonNameSnapshot" VARCHAR(255) NOT NULL,
    "contactNumberSnapshot" VARCHAR(32) NOT NULL,
    "emailSnapshot" VARCHAR(320) NOT NULL,
    "meetingDate" DATE NOT NULL,
    "discussionNotes" TEXT NOT NULL,
    "coursesDiscussed" TEXT NOT NULL,
    "expectedCandidates" INTEGER NOT NULL,
    "expectedTrainingDate" DATE NOT NULL,
    "visitOutcome" VARCHAR(50),
    "branchId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_marketing_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_sales_follow_ups" (
    "id" UUID NOT NULL,
    "corporateSalesLeadId" UUID NOT NULL,
    "assignedToUserId" UUID NOT NULL,
    "followUpDate" TIMESTAMPTZ(6) NOT NULL,
    "followUpType" VARCHAR(50) NOT NULL,
    "notes" TEXT NOT NULL,
    "outcome" VARCHAR(100),
    "nextFollowUpDate" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    "reminderGenerated" BOOLEAN NOT NULL DEFAULT false,
    "branchId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_sales_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "quotationNumber" VARCHAR(80) NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "corporateSalesLeadId" UUID NOT NULL,
    "quotationDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "subtotal" DECIMAL(18,3) NOT NULL,
    "discountAmount" DECIMAL(18,3) NOT NULL,
    "taxAmount" DECIMAL(18,3) NOT NULL,
    "totalAmount" DECIMAL(18,3) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "branchId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_line_items" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,3) NOT NULL,
    "discountAmount" DECIMAL(18,3) NOT NULL,
    "taxAmount" DECIMAL(18,3) NOT NULL,
    "lineTotal" DECIMAL(18,3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quotation_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_revisions" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "revisionReason" TEXT NOT NULL,
    "revisedBy" UUID NOT NULL,
    "revisedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_costing_sheets" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "trainerCost" DECIMAL(18,3) NOT NULL,
    "venueCost" DECIMAL(18,3) NOT NULL,
    "equipmentCost" DECIMAL(18,3) NOT NULL,
    "printingCost" DECIMAL(18,3) NOT NULL,
    "certificateCost" DECIMAL(18,3) NOT NULL,
    "travelCost" DECIMAL(18,3) NOT NULL,
    "accommodationCost" DECIMAL(18,3) NOT NULL,
    "foodCost" DECIMAL(18,3) NOT NULL,
    "vehicleCost" DECIMAL(18,3) NOT NULL,
    "administrationCost" DECIMAL(18,3) NOT NULL,
    "marketingCost" DECIMAL(18,3) NOT NULL,
    "miscellaneousCost" DECIMAL(18,3) NOT NULL,
    "totalDirectCost" DECIMAL(18,3) NOT NULL,
    "totalIndirectCost" DECIMAL(18,3) NOT NULL,
    "totalCost" DECIMAL(18,3) NOT NULL,
    "sellingPrice" DECIMAL(18,3) NOT NULL,
    "profitAmount" DECIMAL(18,3) NOT NULL,
    "profitPercentage" DECIMAL(5,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quotation_costing_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL,
    "salesOrderNumber" VARCHAR(80) NOT NULL,
    "quotationId" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "orderDate" DATE NOT NULL,
    "totalAmount" DECIMAL(18,3) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "LpoDocumentId" UUID,
    "branchId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporate_sales_leads_corporateAccountId_stage_idx" ON "corporate_sales_leads"("corporateAccountId", "stage");

-- CreateIndex
CREATE INDEX "corporate_sales_leads_branchId_idx" ON "corporate_sales_leads"("branchId");

-- CreateIndex
CREATE INDEX "corporate_marketing_visits_corporateSalesLeadId_idx" ON "corporate_marketing_visits"("corporateSalesLeadId");

-- CreateIndex
CREATE INDEX "corporate_marketing_visits_corporateAccountId_idx" ON "corporate_marketing_visits"("corporateAccountId");

-- CreateIndex
CREATE INDEX "corporate_marketing_visits_branchId_idx" ON "corporate_marketing_visits"("branchId");

-- CreateIndex
CREATE INDEX "corporate_sales_follow_ups_corporateSalesLeadId_idx" ON "corporate_sales_follow_ups"("corporateSalesLeadId");

-- CreateIndex
CREATE INDEX "corporate_sales_follow_ups_assignedToUserId_status_idx" ON "corporate_sales_follow_ups"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "corporate_sales_follow_ups_branchId_idx" ON "corporate_sales_follow_ups"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotationNumber_key" ON "quotations"("quotationNumber");

-- CreateIndex
CREATE INDEX "quotations_corporateAccountId_idx" ON "quotations"("corporateAccountId");

-- CreateIndex
CREATE INDEX "quotations_corporateSalesLeadId_idx" ON "quotations"("corporateSalesLeadId");

-- CreateIndex
CREATE INDEX "quotations_branchId_status_idx" ON "quotations"("branchId", "status");

-- CreateIndex
CREATE INDEX "quotation_line_items_quotationId_idx" ON "quotation_line_items"("quotationId");

-- CreateIndex
CREATE INDEX "quotation_revisions_quotationId_idx" ON "quotation_revisions"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_costing_sheets_quotationId_key" ON "quotation_costing_sheets"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_salesOrderNumber_key" ON "sales_orders"("salesOrderNumber");

-- CreateIndex
CREATE INDEX "sales_orders_quotationId_idx" ON "sales_orders"("quotationId");

-- CreateIndex
CREATE INDEX "sales_orders_corporateAccountId_idx" ON "sales_orders"("corporateAccountId");

-- CreateIndex
CREATE INDEX "sales_orders_branchId_idx" ON "sales_orders"("branchId");

-- AddForeignKey
ALTER TABLE "corporate_sales_leads" ADD CONSTRAINT "corporate_sales_leads_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_sales_leads" ADD CONSTRAINT "corporate_sales_leads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_marketing_visits" ADD CONSTRAINT "corporate_marketing_visits_corporateSalesLeadId_fkey" FOREIGN KEY ("corporateSalesLeadId") REFERENCES "corporate_sales_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_marketing_visits" ADD CONSTRAINT "corporate_marketing_visits_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_marketing_visits" ADD CONSTRAINT "corporate_marketing_visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_sales_follow_ups" ADD CONSTRAINT "corporate_sales_follow_ups_corporateSalesLeadId_fkey" FOREIGN KEY ("corporateSalesLeadId") REFERENCES "corporate_sales_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_sales_follow_ups" ADD CONSTRAINT "corporate_sales_follow_ups_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_corporateSalesLeadId_fkey" FOREIGN KEY ("corporateSalesLeadId") REFERENCES "corporate_sales_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_costing_sheets" ADD CONSTRAINT "quotation_costing_sheets_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
