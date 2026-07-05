-- AlterTable
ALTER TABLE "attendance_alerts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_corrections" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_records" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "attendance_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "attendance_corrections_attendance_record_id_requested_at_idx" RENAME TO "attendance_corrections_attendanceRecordId_requestedAt_idx";

-- RenameIndex
ALTER INDEX "attendance_corrections_attendance_record_id_status_idx" RENAME TO "attendance_corrections_attendanceRecordId_status_idx";
