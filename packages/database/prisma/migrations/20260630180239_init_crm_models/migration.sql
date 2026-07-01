/*
  Warnings:

  - The values [Interested,Dropped] on the enum `LeadStage` will be removed. If these variants are still used in the database, this will fail.
  - The `source` column on the `inquiries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `phone` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `interestedCourseId` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `leadNumber` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `personId` on table `leads` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'Phone';
ALTER TYPE "LeadSource" ADD VALUE 'WhatsApp';
ALTER TYPE "LeadSource" ADD VALUE 'Facebook';
ALTER TYPE "LeadSource" ADD VALUE 'Instagram';
ALTER TYPE "LeadSource" ADD VALUE 'GoogleAds';
ALTER TYPE "LeadSource" ADD VALUE 'CorporateReferral';

-- AlterEnum
BEGIN;
CREATE TYPE "LeadStage_new" AS ENUM ('New', 'Contacted', 'FollowUp', 'Qualified', 'Negotiation', 'Won', 'Converted', 'Lost');
ALTER TABLE "public"."leads" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "stage" TYPE "LeadStage_new" USING ("stage"::text::"LeadStage_new");
ALTER TYPE "LeadStage" RENAME TO "LeadStage_old";
ALTER TYPE "LeadStage_new" RENAME TO "LeadStage";
DROP TYPE "public"."LeadStage_old";
ALTER TABLE "leads" ALTER COLUMN "stage" SET DEFAULT 'New';
COMMIT;

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_interestedCourseId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_personId_fkey";

-- AlterTable
ALTER TABLE "inquiries" DROP COLUMN "source",
ADD COLUMN     "source" "LeadSource" NOT NULL DEFAULT 'Other';

-- AlterTable
ALTER TABLE "lead_follow_ups" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'Active',
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "interestedCourseId" SET NOT NULL,
ALTER COLUMN "leadNumber" SET NOT NULL,
ALTER COLUMN "personId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "lead_follow_ups_counselorId_idx" ON "lead_follow_ups"("counselorId");

-- CreateIndex
CREATE INDEX "lead_follow_ups_status_idx" ON "lead_follow_ups"("status");

-- CreateIndex
CREATE INDEX "leads_personId_idx" ON "leads"("personId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_interestedCourseId_fkey" FOREIGN KEY ("interestedCourseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
