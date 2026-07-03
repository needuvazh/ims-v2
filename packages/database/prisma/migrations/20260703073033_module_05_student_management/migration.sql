/*
  Warnings:

  - You are about to drop the column `createdAt` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `deletedBy` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `idCardIssued` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `idCardNumber` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `studentNumber` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `student_profiles` table. All the data in the column will be lost.
  - The `status` column on the `student_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[passportNumber]` on the table `persons` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[visaNumber]` on the table `persons` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[person_id]` on the table `student_profiles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branch_id` to the `student_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_id` to the `student_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_number` to the `student_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudentStatus" ADD VALUE 'Pending';
ALTER TYPE "StudentStatus" ADD VALUE 'Archived';

-- DropForeignKey
ALTER TABLE "student_profiles" DROP CONSTRAINT "student_profiles_personId_fkey";

-- DropIndex
DROP INDEX "persons_email_key";

-- DropIndex
DROP INDEX "persons_mobile_key";

-- DropIndex
DROP INDEX "student_profiles_idCardNumber_key";

-- DropIndex
DROP INDEX "student_profiles_personId_idx";

-- DropIndex
DROP INDEX "student_profiles_personId_key";

-- DropIndex
DROP INDEX "student_profiles_studentNumber_key";

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "localizedName" JSONB,
ADD COLUMN     "passportNumber" VARCHAR(50),
ADD COLUMN     "photoUrl" VARCHAR(255),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visaNumber" VARCHAR(50);

-- AlterTable
ALTER TABLE "student_profiles" DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "deletedAt",
DROP COLUMN "deletedBy",
DROP COLUMN "idCardIssued",
DROP COLUMN "idCardNumber",
DROP COLUMN "isDeleted",
DROP COLUMN "joinedAt",
DROP COLUMN "personId",
DROP COLUMN "studentNumber",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedBy",
ADD COLUMN     "branch_id" UUID NOT NULL,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "creation_source" VARCHAR(30) NOT NULL DEFAULT 'DirectRegistration',
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "duplicate_review_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "effective_end_date" DATE,
ADD COLUMN     "effective_start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id_card_issued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "id_card_number" VARCHAR(50),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "person_id" UUID NOT NULL,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "source_admission_id" UUID,
ADD COLUMN     "source_corporate_participant_id" UUID,
ADD COLUMN     "student_number" VARCHAR(50) NOT NULL,
ADD COLUMN     "student_status" "StudentStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_by" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'Active';

-- CreateTable
CREATE TABLE "student_status_history" (
    "id" UUID NOT NULL,
    "student_profile_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "old_status" VARCHAR(30) NOT NULL,
    "new_status" VARCHAR(30) NOT NULL,
    "change_reason" VARCHAR(500) NOT NULL,
    "effective_start_date" DATE NOT NULL,
    "effective_end_date" DATE,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_id_card_history" (
    "id" UUID NOT NULL,
    "student_profile_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "old_id_card_number" VARCHAR(50),
    "new_id_card_number" VARCHAR(50),
    "event_date" DATE NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "performed_by_user_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_id_card_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_duplicate_cases" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "case_number" VARCHAR(50) NOT NULL,
    "source_type" VARCHAR(30) NOT NULL,
    "source_student_profile_id" UUID,
    "source_person_id" UUID,
    "case_status" VARCHAR(30) NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL,
    "trigger_summary" VARCHAR(500) NOT NULL,
    "resolution_type" VARCHAR(30),
    "resolution_reason" VARCHAR(1000),
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_duplicate_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_duplicate_case_items" (
    "id" UUID NOT NULL,
    "duplicate_case_id" UUID NOT NULL,
    "candidate_student_profile_id" UUID,
    "candidate_person_id" UUID,
    "candidate_branch_id" UUID,
    "match_score" DECIMAL(5,2) NOT NULL,
    "match_reasons" JSONB NOT NULL,
    "resolution_decision" VARCHAR(30),
    "is_primary_candidate" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_duplicate_case_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_merge_logs" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "duplicate_case_id" UUID,
    "survivor_student_profile_id" UUID NOT NULL,
    "source_student_profile_id" UUID NOT NULL,
    "merge_reason" VARCHAR(1000) NOT NULL,
    "merged_at" TIMESTAMPTZ(6) NOT NULL,
    "merged_by" UUID NOT NULL,
    "reassigned_admissions_count" INTEGER NOT NULL,
    "reassigned_enrollments_count" INTEGER NOT NULL,
    "reassigned_documents_count" INTEGER NOT NULL,
    "reassigned_other_refs_count" INTEGER NOT NULL,
    "merge_payload" JSONB NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Completed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_merge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_export_logs" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "export_scope" VARCHAR(30) NOT NULL,
    "export_format" VARCHAR(10) NOT NULL,
    "filter_snapshot" JSONB NOT NULL,
    "row_count" INTEGER NOT NULL,
    "included_masked_identity" BOOLEAN NOT NULL,
    "reason" VARCHAR(500),
    "export_status" VARCHAR(30) NOT NULL,
    "exported_at" TIMESTAMPTZ(6) NOT NULL,
    "file_reference" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_status_history_student_profile_id_effective_start_d_idx" ON "student_status_history"("student_profile_id", "effective_start_date");

-- CreateIndex
CREATE INDEX "student_status_history_branch_id_new_status_idx" ON "student_status_history"("branch_id", "new_status");

-- CreateIndex
CREATE INDEX "student_id_card_history_student_profile_id_event_date_idx" ON "student_id_card_history"("student_profile_id", "event_date");

-- CreateIndex
CREATE INDEX "student_id_card_history_branch_id_event_type_idx" ON "student_id_card_history"("branch_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "student_duplicate_cases_case_number_key" ON "student_duplicate_cases"("case_number");

-- CreateIndex
CREATE INDEX "student_duplicate_cases_branch_id_case_status_idx" ON "student_duplicate_cases"("branch_id", "case_status");

-- CreateIndex
CREATE INDEX "student_duplicate_case_items_duplicate_case_id_match_score_idx" ON "student_duplicate_case_items"("duplicate_case_id", "match_score");

-- CreateIndex
CREATE INDEX "student_merge_logs_survivor_student_profile_id_merged_at_idx" ON "student_merge_logs"("survivor_student_profile_id", "merged_at");

-- CreateIndex
CREATE INDEX "student_merge_logs_source_student_profile_id_idx" ON "student_merge_logs"("source_student_profile_id");

-- CreateIndex
CREATE INDEX "student_merge_logs_branch_id_merged_at_idx" ON "student_merge_logs"("branch_id", "merged_at");

-- CreateIndex
CREATE INDEX "student_export_logs_branch_id_exported_at_idx" ON "student_export_logs"("branch_id", "exported_at");

-- CreateIndex
CREATE INDEX "student_export_logs_requested_by_exported_at_idx" ON "student_export_logs"("requested_by", "exported_at");

-- CreateIndex
CREATE UNIQUE INDEX "persons_passportNumber_key" ON "persons"("passportNumber");

-- CreateIndex
CREATE UNIQUE INDEX "persons_visaNumber_key" ON "persons"("visaNumber");

-- CreateIndex
CREATE INDEX "persons_mobile_idx" ON "persons"("mobile");

-- CreateIndex
CREATE INDEX "persons_email_idx" ON "persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_person_id_key" ON "student_profiles"("person_id") WHERE is_deleted = false;

-- CreateIndex
CREATE UNIQUE INDEX ux_student_profiles_student_number_active ON student_profiles(student_number) WHERE is_deleted = false;

-- CreateIndex
CREATE UNIQUE INDEX ux_student_profiles_id_card_number_active ON student_profiles(id_card_number) WHERE id_card_number IS NOT NULL AND is_deleted = false;

-- CreateIndex
CREATE INDEX "student_profiles_person_id_idx" ON "student_profiles"("person_id");

-- CreateIndex
CREATE INDEX "student_profiles_branch_id_student_status_idx" ON "student_profiles"("branch_id", "student_status");

-- CreateIndex
CREATE INDEX "student_profiles_branch_id_joined_at_idx" ON "student_profiles"("branch_id", "joined_at");

-- CreateIndex
CREATE INDEX "student_profiles_source_admission_id_idx" ON "student_profiles"("source_admission_id");

-- CreateIndex
CREATE INDEX "student_profiles_source_corporate_participant_id_idx" ON "student_profiles"("source_corporate_participant_id");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_id_card_history" ADD CONSTRAINT "student_id_card_history_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_id_card_history" ADD CONSTRAINT "student_id_card_history_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_duplicate_cases" ADD CONSTRAINT "student_duplicate_cases_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_duplicate_case_items" ADD CONSTRAINT "student_duplicate_case_items_duplicate_case_id_fkey" FOREIGN KEY ("duplicate_case_id") REFERENCES "student_duplicate_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_merge_logs" ADD CONSTRAINT "student_merge_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_merge_logs" ADD CONSTRAINT "student_merge_logs_duplicate_case_id_fkey" FOREIGN KEY ("duplicate_case_id") REFERENCES "student_duplicate_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_merge_logs" ADD CONSTRAINT "student_merge_logs_survivor_student_profile_id_fkey" FOREIGN KEY ("survivor_student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_merge_logs" ADD CONSTRAINT "student_merge_logs_source_student_profile_id_fkey" FOREIGN KEY ("source_student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_export_logs" ADD CONSTRAINT "student_export_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
