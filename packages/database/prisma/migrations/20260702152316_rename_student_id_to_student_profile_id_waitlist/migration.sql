-- DropIndex
DROP INDEX IF EXISTS "waiting_lists_studentId_idx";

-- AlterTable (Rename studentId to studentProfileId to preserve data, and add enrollmentId)
ALTER TABLE "waiting_lists" RENAME COLUMN "studentId" TO "studentProfileId";
ALTER TABLE "waiting_lists" ADD COLUMN "enrollmentId" UUID;

-- CreateIndex
CREATE INDEX "enrollments_studentProfileId_batchId_idx" ON "enrollments"("studentProfileId", "batchId");

-- CreateIndex
CREATE INDEX "waiting_lists_studentProfileId_idx" ON "waiting_lists"("studentProfileId");

-- CreateIndex
CREATE INDEX "waiting_lists_enrollmentId_idx" ON "waiting_lists"("enrollmentId");

-- CreateIndex
CREATE INDEX "waiting_lists_studentProfileId_batchId_idx" ON "waiting_lists"("studentProfileId", "batchId");

-- CreateIndex
CREATE INDEX "waiting_lists_leadId_batchId_idx" ON "waiting_lists"("leadId", "batchId");

-- Create Partial Unique Indexes for Waitlist Active Queue
CREATE UNIQUE INDEX "waiting_lists_student_profile_batch_unique" ON "waiting_lists"("studentProfileId", "batchId") WHERE "status" IN ('Waiting', 'Promoted') AND "isDeleted" = false;
CREATE UNIQUE INDEX "waiting_lists_lead_batch_unique" ON "waiting_lists"("leadId", "batchId") WHERE "status" IN ('Waiting', 'Promoted') AND "isDeleted" = false;

-- Create Partial Unique Index for Enrollment Active/Pending set
CREATE UNIQUE INDEX "enrollments_student_profile_batch_unique" ON "enrollments"("studentProfileId", "batchId") WHERE "enrollmentStatus" IN ('Draft', 'Submitted', 'Approved', 'Confirmed', 'Active') AND "isDeleted" = false;
