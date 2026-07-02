-- CreateTable
CREATE TABLE "corporate_accounts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "accountCode" VARCHAR(50) NOT NULL,
    "accountName" VARCHAR(150) NOT NULL,
    "creditLimit" DECIMAL(12,3) NOT NULL,
    "currentOutstanding" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "blockOnCreditLimit" BOOLEAN NOT NULL DEFAULT true,
    "billingCycle" VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corporate_accounts_accountCode_key" ON "corporate_accounts"("accountCode");

-- CreateIndex
CREATE INDEX "corporate_accounts_organizationId_idx" ON "corporate_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "corporate_accounts_status_idx" ON "corporate_accounts"("status");
