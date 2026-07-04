-- Allow multiple correction history rows per attendance record.
ALTER TABLE "attendance_corrections"
  DROP CONSTRAINT IF EXISTS "attendance_corrections_attendanceRecordId_key";

-- Keep the history and pending-lookup queries fast.
CREATE INDEX IF NOT EXISTS "attendance_corrections_attendance_record_id_status_idx"
  ON "attendance_corrections" ("attendanceRecordId", "status");

CREATE INDEX IF NOT EXISTS "attendance_corrections_attendance_record_id_requested_at_idx"
  ON "attendance_corrections" ("attendanceRecordId", "requestedAt");
