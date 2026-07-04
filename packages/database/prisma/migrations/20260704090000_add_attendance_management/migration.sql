-- Create enums
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('Draft', 'Open', 'Submitted', 'Locked', 'Reopened', 'Cancelled');
CREATE TYPE "AttendanceRecordStatus" AS ENUM ('Present', 'Absent', 'Late', 'Excused', 'Unmarked');
CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
CREATE TYPE "AttendanceAlertStatus" AS ENUM ('Active', 'Acknowledged', 'Resolved');

-- Create attendance sessions
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "markedByTrainerId" UUID,
    "status" "AttendanceSessionStatus" NOT NULL DEFAULT 'Draft',
    "openedAt" TIMESTAMPTZ(6),
    "submittedAt" TIMESTAMPTZ(6),
    "lockedAt" TIMESTAMPTZ(6),
    "reopenedAt" TIMESTAMPTZ(6),
    "markedAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_sessions_sessionId_key" ON "attendance_sessions"("sessionId");
CREATE INDEX "attendance_sessions_batchId_idx" ON "attendance_sessions"("batchId");
CREATE INDEX "attendance_sessions_branchId_idx" ON "attendance_sessions"("branchId");
CREATE INDEX "attendance_sessions_attendanceDate_idx" ON "attendance_sessions"("attendanceDate");
CREATE INDEX "attendance_sessions_status_idx" ON "attendance_sessions"("status");

ALTER TABLE "attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_sessions_markedByTrainerId_fkey" FOREIGN KEY ("markedByTrainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create attendance records
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attendanceSessionId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "status" "AttendanceRecordStatus" NOT NULL DEFAULT 'Unmarked',
    "remarks" TEXT,
    "markedAt" TIMESTAMPTZ(6),
    "markedBy" UUID,
    "lateMinutes" INTEGER,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "correctionStatus" VARCHAR(50) NOT NULL DEFAULT 'None',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_records_attendanceSessionId_enrollmentId_key" ON "attendance_records"("attendanceSessionId", "enrollmentId");
CREATE INDEX "attendance_records_attendanceSessionId_idx" ON "attendance_records"("attendanceSessionId");
CREATE INDEX "attendance_records_enrollmentId_idx" ON "attendance_records"("enrollmentId");
CREATE INDEX "attendance_records_studentProfileId_idx" ON "attendance_records"("studentProfileId");
CREATE INDEX "attendance_records_branchId_idx" ON "attendance_records"("branchId");
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_records_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_records_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create attendance corrections
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attendanceRecordId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "oldStatus" "AttendanceRecordStatus" NOT NULL,
    "newStatus" "AttendanceRecordStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" UUID NOT NULL,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "rejectedBy" UUID,
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,
    "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_corrections_attendanceRecordId_key" ON "attendance_corrections"("attendanceRecordId");
CREATE INDEX "attendance_corrections_branchId_idx" ON "attendance_corrections"("branchId");
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections"("status");
CREATE INDEX "attendance_corrections_requestedAt_idx" ON "attendance_corrections"("requestedAt");

ALTER TABLE "attendance_corrections"
  ADD CONSTRAINT "attendance_corrections_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_corrections_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_corrections_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_corrections_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_corrections_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create attendance alerts
CREATE TABLE "attendance_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attendanceSessionId" UUID,
    "attendanceRecordId" UUID,
    "enrollmentId" UUID,
    "branchId" UUID NOT NULL,
    "alertCode" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(30) NOT NULL,
    "thresholdPercentage" DECIMAL(5,2),
    "actualPercentage" DECIMAL(5,2),
    "message" TEXT NOT NULL,
    "status" "AttendanceAlertStatus" NOT NULL DEFAULT 'Active',
    "triggeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "acknowledgedBy" UUID,
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedBy" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "attendance_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_alerts_branchId_idx" ON "attendance_alerts"("branchId");
CREATE INDEX "attendance_alerts_status_idx" ON "attendance_alerts"("status");
CREATE INDEX "attendance_alerts_triggeredAt_idx" ON "attendance_alerts"("triggeredAt");

ALTER TABLE "attendance_alerts"
  ADD CONSTRAINT "attendance_alerts_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_alerts_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_alerts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_alerts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_alerts_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_alerts_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
