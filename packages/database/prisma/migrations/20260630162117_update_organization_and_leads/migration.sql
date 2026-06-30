/*
  Warnings:

  - The `status` column on the `branches` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `date` on the `lead_follow_ups` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[leadNumber]` on the table `leads` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `followUpDate` to the `lead_follow_ups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `followUpType` to the `lead_follow_ups` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('Draft', 'Configured', 'Active', 'UnderMaintenance', 'Suspended', 'Closed', 'Archived');

-- AlterTable
ALTER TABLE "branches" DROP COLUMN "status",
ADD COLUMN     "status" "BranchStatus" NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "institutes" ADD COLUMN     "currency" VARCHAR(10),
ADD COLUMN     "effectiveEndDate" DATE,
ADD COLUMN     "effectiveStartDate" DATE,
ADD COLUMN     "language" VARCHAR(10),
ADD COLUMN     "legalNameArabic" VARCHAR(255),
ADD COLUMN     "legalNameEnglish" VARCHAR(255),
ADD COLUMN     "shortName" VARCHAR(100),
ADD COLUMN     "timezone" VARCHAR(50),
ADD COLUMN     "tradeName" VARCHAR(255);

-- AlterTable
ALTER TABLE "lead_follow_ups" DROP COLUMN "date",
ADD COLUMN     "followUpDate" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "followUpType" VARCHAR(50) NOT NULL,
ADD COLUMN     "outcome" VARCHAR(50),
ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
ADD COLUMN     "updatedAt" TIMESTAMPTZ(6),
ADD COLUMN     "updatedBy" UUID,
ALTER COLUMN "notes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "inquiryId" UUID,
ADD COLUMN     "interestedCourseId" UUID,
ADD COLUMN     "leadNumber" VARCHAR(50),
ADD COLUMN     "lostReasonCode" VARCHAR(50),
ADD COLUMN     "lostReasonNotes" TEXT,
ADD COLUMN     "personId" UUID,
ADD COLUMN     "priority" VARCHAR(20) NOT NULL DEFAULT 'Medium',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "branch_contacts" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "contactType" VARCHAR(50) NOT NULL,
    "contactValue" VARCHAR(255) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_addresses" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "building" VARCHAR(100),
    "street" VARCHAR(255),
    "city" VARCHAR(100),
    "governorate" VARCHAR(100),
    "country" VARCHAR(100),
    "postalCode" VARCHAR(30),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_settings" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "currency" VARCHAR(10),
    "timezone" VARCHAR(50),
    "weekStartDay" VARCHAR(20),
    "workingCalendar" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_policies" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "policyType" VARCHAR(50) NOT NULL,
    "policyContent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "campaignName" VARCHAR(150) NOT NULL,
    "campaignType" VARCHAR(50) NOT NULL,
    "utmSource" VARCHAR(100) NOT NULL,
    "utmMedium" VARCHAR(100) NOT NULL,
    "utmCampaign" VARCHAR(100) NOT NULL,
    "budget" DECIMAL(12,3) NOT NULL,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "courseCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "inquiryNumber" VARCHAR(50) NOT NULL,
    "branchId" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "source" VARCHAR(50) NOT NULL DEFAULT 'Other',
    "interestedCourseId" UUID,
    "counselorId" UUID,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'Medium',
    "notes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Captured',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateRefId" VARCHAR(150),
    "utmSource" VARCHAR(100),
    "utmMedium" VARCHAR(100),
    "utmCampaign" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branchId_key" ON "branch_settings"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_campaignName_key" ON "campaigns"("campaignName");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_utmSource_utmMedium_utmCampaign_key" ON "campaigns"("utmSource", "utmMedium", "utmCampaign");

-- CreateIndex
CREATE UNIQUE INDEX "courses_courseCode_key" ON "courses"("courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_inquiryNumber_key" ON "inquiries"("inquiryNumber");

-- CreateIndex
CREATE INDEX "inquiries_branchId_idx" ON "inquiries"("branchId");

-- CreateIndex
CREATE INDEX "inquiries_counselorId_idx" ON "inquiries"("counselorId");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "branches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_leadNumber_key" ON "leads"("leadNumber");

-- CreateIndex
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "branch_contacts" ADD CONSTRAINT "branch_contacts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_addresses" ADD CONSTRAINT "branch_addresses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_policies" ADD CONSTRAINT "branch_policies_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_interestedCourseId_fkey" FOREIGN KEY ("interestedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_interestedCourseId_fkey" FOREIGN KEY ("interestedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
