-- Remove the leftover unique index so multiple correction history rows can exist per attendance record.
DROP INDEX IF EXISTS "attendance_corrections_attendanceRecordId_key";
