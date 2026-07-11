-- AlterTable
ALTER TABLE "corporate_accounts" ADD COLUMN     "branchId" UUID;

-- CreateTable
CREATE TABLE "corporate_contacts" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "designation" VARCHAR(150),
    "department" VARCHAR(150),
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "portalAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_contracts" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "contractNumber" VARCHAR(80) NOT NULL,
    "contractValue" DECIMAL(18,3) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "billingModel" VARCHAR(50) NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_participants" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "employeeCode" VARCHAR(80),
    "department" VARCHAR(150),
    "designation" VARCHAR(150),
    "linkedStudentProfileId" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_enrollments" (
    "id" UUID NOT NULL,
    "corporateAccountId" UUID NOT NULL,
    "corporateParticipantId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "contractId" UUID,
    "billingStatus" VARCHAR(50) NOT NULL DEFAULT 'NotRequested',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "corporate_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corporate_contacts_corporateAccountId_status_idx" ON "corporate_contacts"("corporateAccountId", "status");

-- CreateIndex
CREATE INDEX "corporate_contacts_personId_idx" ON "corporate_contacts"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_contacts_corporateAccountId_personId_key" ON "corporate_contacts"("corporateAccountId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_contracts_contractNumber_key" ON "corporate_contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "corporate_contracts_corporateAccountId_status_idx" ON "corporate_contracts"("corporateAccountId", "status");

-- CreateIndex
CREATE INDEX "corporate_contracts_startDate_endDate_idx" ON "corporate_contracts"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "corporate_participants_corporateAccountId_status_idx" ON "corporate_participants"("corporateAccountId", "status");

-- CreateIndex
CREATE INDEX "corporate_participants_personId_idx" ON "corporate_participants"("personId");

-- CreateIndex
CREATE INDEX "corporate_participants_linkedStudentProfileId_idx" ON "corporate_participants"("linkedStudentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_participants_corporateAccountId_personId_key" ON "corporate_participants"("corporateAccountId", "personId");

-- CreateIndex
CREATE INDEX "corporate_enrollments_corporateAccountId_billingStatus_idx" ON "corporate_enrollments"("corporateAccountId", "billingStatus");

-- CreateIndex
CREATE INDEX "corporate_enrollments_corporateParticipantId_idx" ON "corporate_enrollments"("corporateParticipantId");

-- CreateIndex
CREATE INDEX "corporate_enrollments_contractId_idx" ON "corporate_enrollments"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_enrollments_enrollmentId_key" ON "corporate_enrollments"("enrollmentId");

-- CreateIndex
CREATE INDEX "corporate_accounts_branchId_idx" ON "corporate_accounts"("branchId");

-- AddForeignKey
ALTER TABLE "corporate_accounts" ADD CONSTRAINT "corporate_accounts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_contacts" ADD CONSTRAINT "corporate_contacts_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_contacts" ADD CONSTRAINT "corporate_contacts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_contracts" ADD CONSTRAINT "corporate_contracts_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_participants" ADD CONSTRAINT "corporate_participants_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_participants" ADD CONSTRAINT "corporate_participants_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_participants" ADD CONSTRAINT "corporate_participants_linkedStudentProfileId_fkey" FOREIGN KEY ("linkedStudentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_enrollments" ADD CONSTRAINT "corporate_enrollments_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "corporate_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_enrollments" ADD CONSTRAINT "corporate_enrollments_corporateParticipantId_fkey" FOREIGN KEY ("corporateParticipantId") REFERENCES "corporate_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_enrollments" ADD CONSTRAINT "corporate_enrollments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_enrollments" ADD CONSTRAINT "corporate_enrollments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "corporate_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
