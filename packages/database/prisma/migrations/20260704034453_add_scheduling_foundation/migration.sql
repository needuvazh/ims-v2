-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('Draft', 'Conflict', 'Published', 'Rescheduled', 'Cancelled', 'Completed');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('HOLIDAY', 'VENUE', 'TRAINER_OVERLAP', 'CLASSROOM_OVERLAP', 'OPERATING_HOURS');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "conflictType" "ConflictType",
ADD COLUMN     "isConflictIgnored" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "scheduleStatus" "ScheduleStatus" NOT NULL DEFAULT 'Draft';

-- CreateTable
CREATE TABLE "venue_blocks" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "classroomId" UUID,
    "blockDate" DATE NOT NULL,
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "isFullDay" BOOLEAN NOT NULL DEFAULT true,
    "reasonCode" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "venue_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venue_blocks_branchId_blockDate_idx" ON "venue_blocks"("branchId", "blockDate");

-- CreateIndex
CREATE INDEX "venue_blocks_classroomId_blockDate_idx" ON "venue_blocks"("classroomId", "blockDate");

-- AddForeignKey
ALTER TABLE "venue_blocks" ADD CONSTRAINT "venue_blocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_blocks" ADD CONSTRAINT "venue_blocks_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
