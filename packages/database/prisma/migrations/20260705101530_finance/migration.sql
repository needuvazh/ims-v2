-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('StudentInvoice', 'CorporateInvoice', 'AdvanceInvoice', 'MilestoneInvoice', 'FinalInvoice', 'RefundInvoice');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Draft', 'Issued', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled');

-- CreateEnum
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('Draft', 'Active', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('Pending', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'BankTransfer', 'Card', 'Online', 'Cheque', 'CorporateBilling');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Posted', 'Failed', 'Reversed', 'Refunded', 'PartiallyRefunded');

-- CreateEnum
CREATE TYPE "RefundType" AS ENUM ('Full', 'Partial');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('Requested', 'Approved', 'Rejected', 'Executed', 'Cancelled', 'Failed');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('Open', 'PartiallyPaid', 'Overdue', 'Settled', 'WrittenOff');

-- CreateEnum
CREATE TYPE "AgingBucket" AS ENUM ('Current', 'Days30', 'Days60', 'Days90', 'Days120Plus');

-- CreateEnum
CREATE TYPE "CorporateCreditRuleStatus" AS ENUM ('Draft', 'Active', 'Superseded', 'Expired', 'Suspended');

-- CreateTable
CREATE TABLE "finance_invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "studentProfileId" UUID,
    "corporateAccountId" UUID,
    "enrollmentId" UUID,
    "branchId" UUID NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'OMR',
    "subtotal" DECIMAL(18,3) NOT NULL,
    "discountAmount" DECIMAL(18,3) NOT NULL,
    "taxAmount" DECIMAL(18,3) NOT NULL,
    "totalAmount" DECIMAL(18,3) NOT NULL,
    "paidAmount" DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    "outstandingAmount" DECIMAL(18,3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Draft',
    "issuedAt" TIMESTAMPTZ(6),
    "issuedBy" UUID,
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelledBy" UUID,
    "cancellationReason" VARCHAR(500),
    "sourceQuotationId" UUID,
    "sourceSalesOrderId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoice_line_items" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "enrollmentId" UUID,
    "courseId" UUID,
    "sourceBranchId" UUID NOT NULL,
    "lineSequence" INTEGER NOT NULL,
    "descriptionEnglish" VARCHAR(500) NOT NULL,
    "descriptionArabic" VARCHAR(500),
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(18,3) NOT NULL,
    "discountAmount" DECIMAL(18,3) NOT NULL,
    "taxableAmount" DECIMAL(18,3) NOT NULL,
    "taxRate" DECIMAL(7,4) NOT NULL,
    "taxAmount" DECIMAL(18,3) NOT NULL,
    "lineTotal" DECIMAL(18,3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_installment_plans" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "planName" VARCHAR(120) NOT NULL,
    "totalAmount" DECIMAL(18,3) NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'Draft',
    "activatedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_installments" (
    "id" UUID NOT NULL,
    "installmentPlanId" UUID NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(18,3) NOT NULL,
    "paidAmount" DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'Pending',
    "lastPaymentAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_payments" (
    "id" UUID NOT NULL,
    "paymentNumber" VARCHAR(50) NOT NULL,
    "invoiceId" UUID NOT NULL,
    "studentProfileId" UUID,
    "corporateAccountId" UUID,
    "branchId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'OMR',
    "amount" DECIMAL(18,3) NOT NULL,
    "referenceNumber" VARCHAR(120),
    "remarks" VARCHAR(1000),
    "receivedBy" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "idempotencyKey" VARCHAR(100) NOT NULL,
    "postedAt" TIMESTAMPTZ(6),
    "reversedAt" TIMESTAMPTZ(6),
    "reversalReason" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_payment_allocations" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "installmentId" UUID,
    "allocatedAmount" DECIMAL(18,3) NOT NULL,
    "allocationSequence" INTEGER NOT NULL,
    "allocatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_receipts" (
    "id" UUID NOT NULL,
    "receiptNumber" VARCHAR(50) NOT NULL,
    "paymentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "receiptDate" DATE NOT NULL,
    "amount" DECIMAL(18,3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'OMR',
    "receiptUrl" TEXT,
    "issuedBy" UUID NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL,
    "renderVersion" INTEGER NOT NULL DEFAULT 1,
    "lastRenderedAt" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_refunds" (
    "id" UUID NOT NULL,
    "refundNumber" VARCHAR(50) NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "refundType" "RefundType" NOT NULL,
    "amount" DECIMAL(18,3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'OMR',
    "reasonCode" VARCHAR(50) NOT NULL,
    "reasonNarrative" VARCHAR(1000) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'Requested',
    "requestedBy" UUID NOT NULL,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL,
    "decidedBy" UUID,
    "decidedAt" TIMESTAMPTZ(6),
    "decisionReason" VARCHAR(500),
    "executedAt" TIMESTAMPTZ(6),
    "executionReference" VARCHAR(100),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_receivables" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dueDate" DATE NOT NULL,
    "outstandingAmount" DECIMAL(18,3) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'Open',
    "agingBucket" "AgingBucket" NOT NULL DEFAULT 'Current',
    "lastCalculatedAt" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_corporate_credit_rules" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "creditLimit" DECIMAL(18,3) NOT NULL,
    "currentOutstanding" DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    "committedAmount" DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    "availableCredit" DECIMAL(18,3) NOT NULL,
    "blockOnCreditLimit" BOOLEAN NOT NULL DEFAULT true,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "status" "CorporateCreditRuleStatus" NOT NULL DEFAULT 'Draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_corporate_credit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_invoices_branchId_status_invoiceDate_idx" ON "finance_invoices"("branchId", "status", "invoiceDate" DESC);

-- CreateIndex
CREATE INDEX "finance_invoices_branchId_dueDate_status_idx" ON "finance_invoices"("branchId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "finance_invoices_studentProfileId_invoiceDate_idx" ON "finance_invoices"("studentProfileId", "invoiceDate" DESC);

-- CreateIndex
CREATE INDEX "finance_invoices_corporateAccountId_invoiceDate_idx" ON "finance_invoices"("corporateAccountId", "invoiceDate" DESC);

-- CreateIndex
CREATE INDEX "finance_invoices_enrollmentId_idx" ON "finance_invoices"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoices_branchId_invoiceNumber_key" ON "finance_invoices"("branchId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "finance_invoice_line_items_invoiceId_idx" ON "finance_invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_invoice_line_items_enrollmentId_idx" ON "finance_invoice_line_items"("enrollmentId");

-- CreateIndex
CREATE INDEX "finance_invoice_line_items_sourceBranchId_createdAt_idx" ON "finance_invoice_line_items"("sourceBranchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoice_line_items_invoiceId_lineSequence_key" ON "finance_invoice_line_items"("invoiceId", "lineSequence");

-- CreateIndex
CREATE INDEX "finance_installment_plans_branchId_status_createdAt_idx" ON "finance_installment_plans"("branchId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "finance_installment_plans_enrollmentId_idx" ON "finance_installment_plans"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_installment_plans_invoiceId_key" ON "finance_installment_plans"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_installments_dueDate_status_idx" ON "finance_installments"("dueDate", "status");

-- CreateIndex
CREATE INDEX "finance_installments_installmentPlanId_dueDate_idx" ON "finance_installments"("installmentPlanId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "finance_installments_installmentPlanId_sequenceNumber_key" ON "finance_installments"("installmentPlanId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payments_idempotencyKey_key" ON "finance_payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "finance_payments_invoiceId_status_paymentDate_idx" ON "finance_payments"("invoiceId", "status", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "finance_payments_branchId_paymentDate_idx" ON "finance_payments"("branchId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "finance_payments_studentProfileId_paymentDate_idx" ON "finance_payments"("studentProfileId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "finance_payments_corporateAccountId_paymentDate_idx" ON "finance_payments"("corporateAccountId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "finance_payments_referenceNumber_idx" ON "finance_payments"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payments_branchId_paymentNumber_key" ON "finance_payments"("branchId", "paymentNumber");

-- CreateIndex
CREATE INDEX "finance_payment_allocations_paymentId_idx" ON "finance_payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "finance_payment_allocations_invoiceId_idx" ON "finance_payment_allocations"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_payment_allocations_installmentId_idx" ON "finance_payment_allocations"("installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payment_allocations_paymentId_allocationSequence_key" ON "finance_payment_allocations"("paymentId", "allocationSequence");

-- CreateIndex
CREATE UNIQUE INDEX "finance_receipts_paymentId_key" ON "finance_receipts"("paymentId");

-- CreateIndex
CREATE INDEX "finance_receipts_branchId_receiptDate_idx" ON "finance_receipts"("branchId", "receiptDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "finance_receipts_branchId_receiptNumber_key" ON "finance_receipts"("branchId", "receiptNumber");

-- CreateIndex
CREATE INDEX "finance_refunds_paymentId_idx" ON "finance_refunds"("paymentId");

-- CreateIndex
CREATE INDEX "finance_refunds_invoiceId_idx" ON "finance_refunds"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_refunds_branchId_idx" ON "finance_refunds"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_refunds_branchId_refundNumber_key" ON "finance_refunds"("branchId", "refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "finance_receivables_invoiceId_key" ON "finance_receivables"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_receivables_branchId_status_dueDate_idx" ON "finance_receivables"("branchId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "finance_corporate_credit_rules_corporateAccountId_status_idx" ON "finance_corporate_credit_rules"("corporateAccountId", "status");

-- CreateIndex
CREATE INDEX "finance_corporate_credit_rules_branchId_idx" ON "finance_corporate_credit_rules"("branchId");

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line_items" ADD CONSTRAINT "finance_invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line_items" ADD CONSTRAINT "finance_invoice_line_items_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line_items" ADD CONSTRAINT "finance_invoice_line_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_invoice_line_items" ADD CONSTRAINT "finance_invoice_line_items_sourceBranchId_fkey" FOREIGN KEY ("sourceBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_installment_plans" ADD CONSTRAINT "finance_installment_plans_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_installment_plans" ADD CONSTRAINT "finance_installment_plans_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_installment_plans" ADD CONSTRAINT "finance_installment_plans_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_installments" ADD CONSTRAINT "finance_installments_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "finance_installment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment_allocations" ADD CONSTRAINT "finance_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "finance_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payment_allocations" ADD CONSTRAINT "finance_payment_allocations_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "finance_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receipts" ADD CONSTRAINT "finance_receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "finance_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receipts" ADD CONSTRAINT "finance_receipts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receipts" ADD CONSTRAINT "finance_receipts_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_refunds" ADD CONSTRAINT "finance_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "finance_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_refunds" ADD CONSTRAINT "finance_refunds_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_refunds" ADD CONSTRAINT "finance_refunds_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_refunds" ADD CONSTRAINT "finance_refunds_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_refunds" ADD CONSTRAINT "finance_refunds_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receivables" ADD CONSTRAINT "finance_receivables_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receivables" ADD CONSTRAINT "finance_receivables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_corporate_credit_rules" ADD CONSTRAINT "finance_corporate_credit_rules_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_corporate_credit_rules" ADD CONSTRAINT "finance_corporate_credit_rules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
