-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CIVIL_ID_FRONT', 'CIVIL_ID_BACK', 'PASSPORT_SCAN', 'ACADEMIC_TRANSCRIPT', 'SPONSORSHIP_LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('Draft', 'Active', 'Expired', 'Replaced', 'Deleted');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('Person', 'StudentProfile', 'Admission', 'Enrollment');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "fileKey" VARCHAR(255) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(100) NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "branchId" UUID NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_owners" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "document_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_verifications" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "outcome" "VerificationOutcome" NOT NULL DEFAULT 'Pending',
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMPTZ(6),
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "document_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_branchId_idx" ON "documents"("branchId");

-- CreateIndex
CREATE INDEX "document_owners_ownerId_idx" ON "document_owners"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "document_owners_documentId_ownerId_ownerType_key" ON "document_owners"("documentId", "ownerId", "ownerType");

-- CreateIndex
CREATE INDEX "document_verifications_documentId_idx" ON "document_verifications"("documentId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_owners" ADD CONSTRAINT "document_owners_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_verifications" ADD CONSTRAINT "document_verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
