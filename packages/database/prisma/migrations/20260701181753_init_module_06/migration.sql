/*
  Warnings:

  - Added the required column `effectiveStartDate` to the `course_completion_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minimumAttendancePercent` to the `course_completion_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `basePrice` to the `course_pricings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchType` to the `course_pricings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerType` to the `course_pricings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `effectiveStartDate` to the `course_pricings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "course_completion_rules" ADD COLUMN     "effectiveEndDate" DATE,
ADD COLUMN     "effectiveStartDate" DATE NOT NULL,
ADD COLUMN     "examRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feeClearanceRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "manualApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumAttendancePercent" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "course_pricings" ADD COLUMN     "basePrice" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "batchId" UUID,
ADD COLUMN     "batchType" VARCHAR(50) NOT NULL,
ADD COLUMN     "branchId" UUID,
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'OMR',
ADD COLUMN     "customerType" VARCHAR(50) NOT NULL,
ADD COLUMN     "effectiveEndDate" DATE,
ADD COLUMN     "effectiveStartDate" DATE NOT NULL,
ADD COLUMN     "taxPercentage" DECIMAL(5,3) NOT NULL DEFAULT 5.000,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "course_discounts" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "branchId" UUID,
    "batchId" UUID,
    "discountType" VARCHAR(50) NOT NULL,
    "discountMode" VARCHAR(50) NOT NULL,
    "discountValue" DECIMAL(12,3) NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "classroomId" UUID,
    "batchCode" VARCHAR(50) NOT NULL,
    "batchNameEnglish" VARCHAR(150) NOT NULL,
    "batchNameArabic" VARCHAR(150) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentEnrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "waitingListEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowOverbooking" BOOLEAN NOT NULL DEFAULT false,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "corporateAccountId" UUID,
    "status" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_trainers" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "assignedFrom" DATE NOT NULL,
    "assignedTo" DATE NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "batch_trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiting_lists" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "studentId" UUID,
    "leadId" UUID,
    "queuePosition" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "waiting_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "titleEnglish" VARCHAR(150) NOT NULL,
    "titleArabic" VARCHAR(150) NOT NULL,
    "sessionDate" DATE NOT NULL,
    "startTime" VARCHAR(10) NOT NULL,
    "endTime" VARCHAR(10) NOT NULL,
    "trainerId" UUID,
    "classroomId" UUID,
    "status" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_discounts_courseId_idx" ON "course_discounts"("courseId");

-- CreateIndex
CREATE INDEX "course_discounts_branchId_idx" ON "course_discounts"("branchId");

-- CreateIndex
CREATE INDEX "course_discounts_batchId_idx" ON "course_discounts"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchCode_key" ON "batches"("batchCode");

-- CreateIndex
CREATE INDEX "batches_courseId_idx" ON "batches"("courseId");

-- CreateIndex
CREATE INDEX "batches_branchId_idx" ON "batches"("branchId");

-- CreateIndex
CREATE INDEX "batches_classroomId_idx" ON "batches"("classroomId");

-- CreateIndex
CREATE INDEX "batches_corporateAccountId_idx" ON "batches"("corporateAccountId");

-- CreateIndex
CREATE INDEX "batch_trainers_batchId_idx" ON "batch_trainers"("batchId");

-- CreateIndex
CREATE INDEX "batch_trainers_trainerId_idx" ON "batch_trainers"("trainerId");

-- CreateIndex
CREATE INDEX "waiting_lists_courseId_idx" ON "waiting_lists"("courseId");

-- CreateIndex
CREATE INDEX "waiting_lists_batchId_idx" ON "waiting_lists"("batchId");

-- CreateIndex
CREATE INDEX "waiting_lists_studentId_idx" ON "waiting_lists"("studentId");

-- CreateIndex
CREATE INDEX "waiting_lists_leadId_idx" ON "waiting_lists"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_lists_studentId_batchId_status_key" ON "waiting_lists"("studentId", "batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waiting_lists_leadId_batchId_status_key" ON "waiting_lists"("leadId", "batchId", "status");

-- CreateIndex
CREATE INDEX "sessions_batchId_idx" ON "sessions"("batchId");

-- CreateIndex
CREATE INDEX "sessions_trainerId_idx" ON "sessions"("trainerId");

-- CreateIndex
CREATE INDEX "sessions_classroomId_idx" ON "sessions"("classroomId");

-- CreateIndex
CREATE INDEX "sessions_sessionDate_idx" ON "sessions"("sessionDate");

-- CreateIndex
CREATE INDEX "course_completion_rules_courseId_idx" ON "course_completion_rules"("courseId");

-- CreateIndex
CREATE INDEX "course_pricings_courseId_idx" ON "course_pricings"("courseId");

-- CreateIndex
CREATE INDEX "course_pricings_branchId_idx" ON "course_pricings"("branchId");

-- CreateIndex
CREATE INDEX "course_pricings_batchId_idx" ON "course_pricings"("batchId");

-- AddForeignKey
ALTER TABLE "course_pricings" ADD CONSTRAINT "course_pricings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_discounts" ADD CONSTRAINT "course_discounts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_discounts" ADD CONSTRAINT "course_discounts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_trainers" ADD CONSTRAINT "batch_trainers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiting_lists" ADD CONSTRAINT "waiting_lists_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
