/*
  Warnings:

  - You are about to drop the column `status` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `admissions` table. All the data in the column will be lost.
  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[admissionNumber]` on the table `admissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `admissionNumber` to the `admissions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnrollmentType" AS ENUM ('Regular', 'Corporate', 'WalkIn', 'Online');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('Draft', 'Submitted', 'Approved', 'Confirmed', 'Active', 'Completed', 'Cancelled', 'Dropped', 'CertificateIssued');

-- CreateEnum
CREATE TYPE "PricingSource" AS ENUM ('BatchLevel', 'BranchLevel', 'GlobalDefault');

-- DropForeignKey
ALTER TABLE "admissions" DROP CONSTRAINT "admissions_studentId_fkey";

-- DropIndex
DROP INDEX "admissions_studentId_idx";

-- DropIndex
DROP INDEX "waiting_lists_leadId_batchId_status_key";

-- DropIndex
DROP INDEX "waiting_lists_studentId_batchId_status_key";

-- AlterTable
ALTER TABLE "admissions" DROP COLUMN "status",
DROP COLUMN "studentId",
ADD COLUMN     "admissionNumber" VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE "waiting_lists" ADD COLUMN     "promotionCorrelationId" TEXT,
ADD COLUMN     "statusReason" TEXT;

-- DropTable
DROP TABLE "students";

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "enrollmentNumber" VARCHAR(50) NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "corporateParticipantId" UUID,
    "admissionId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "enrollmentType" "EnrollmentType" NOT NULL DEFAULT 'Regular',
    "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'Draft',
    "pricingSource" "PricingSource" NOT NULL DEFAULT 'GlobalDefault',
    "resolvedPrice" DECIMAL(12,3) NOT NULL,
    "resolvedDiscount" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "finalAmount" DECIMAL(12,3) NOT NULL,
    "paymentValidationRequired" BOOLEAN NOT NULL DEFAULT true,
    "completionStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "certificateStatus" VARCHAR(50) NOT NULL DEFAULT 'NotEligible',
    "confirmedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_in_enrollments" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "walkInDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counterUserId" UUID NOT NULL,
    "paymentCollected" DECIMAL(12,3) NOT NULL,
    "confirmationIssued" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "walk_in_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walk_in_confirmations" (
    "id" UUID NOT NULL,
    "walkInEnrollmentId" UUID NOT NULL,
    "confirmationNumber" VARCHAR(50) NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" UUID NOT NULL,
    "documentUrl" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "walk_in_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_enrollmentNumber_key" ON "enrollments"("enrollmentNumber");

-- CreateIndex
CREATE INDEX "enrollments_studentProfileId_idx" ON "enrollments"("studentProfileId");

-- CreateIndex
CREATE INDEX "enrollments_admissionId_idx" ON "enrollments"("admissionId");

-- CreateIndex
CREATE INDEX "enrollments_batchId_idx" ON "enrollments"("batchId");

-- CreateIndex
CREATE INDEX "enrollments_branchId_idx" ON "enrollments"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_enrollments_enrollmentId_key" ON "walk_in_enrollments"("enrollmentId");

-- CreateIndex
CREATE INDEX "walk_in_enrollments_enrollmentId_idx" ON "walk_in_enrollments"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_confirmations_walkInEnrollmentId_key" ON "walk_in_confirmations"("walkInEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_confirmations_confirmationNumber_key" ON "walk_in_confirmations"("confirmationNumber");

-- CreateIndex
CREATE INDEX "walk_in_confirmations_walkInEnrollmentId_idx" ON "walk_in_confirmations"("walkInEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "admissions_admissionNumber_key" ON "admissions"("admissionNumber");

-- CreateIndex
CREATE INDEX "admissions_leadId_idx" ON "admissions"("leadId");

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_enrollments" ADD CONSTRAINT "walk_in_enrollments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_confirmations" ADD CONSTRAINT "walk_in_confirmations_walkInEnrollmentId_fkey" FOREIGN KEY ("walkInEnrollmentId") REFERENCES "walk_in_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateFilteredUniqueIndex
CREATE UNIQUE INDEX "waiting_lists_student_batch_waiting_idx" ON "waiting_lists"("studentId", "batchId") WHERE "status" = 'Waiting' AND "isDeleted" = false;

-- CreateFilteredUniqueIndex
CREATE UNIQUE INDEX "waiting_lists_lead_batch_waiting_idx" ON "waiting_lists"("leadId", "batchId") WHERE "status" = 'Waiting' AND "isDeleted" = false;

