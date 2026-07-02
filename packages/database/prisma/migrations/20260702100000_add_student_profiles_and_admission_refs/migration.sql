-- Admission & enrollment refactor
-- Creates the new student_profiles table and bridges legacy students/admissions data.

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('Active', 'Suspended', 'Inactive');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected', 'Cancelled');

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "studentNumber" VARCHAR(50) NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'Active',
    "idCardIssued" BOOLEAN NOT NULL DEFAULT false,
    "idCardNumber" VARCHAR(50),
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_personId_key" ON "student_profiles"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_studentNumber_key" ON "student_profiles"("studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_idCardNumber_key" ON "student_profiles"("idCardNumber");

-- CreateIndex
CREATE INDEX "student_profiles_personId_idx" ON "student_profiles"("personId");

-- Backfill persons from legacy students so the new student profile relation has a valid owner.
INSERT INTO "persons" (
    "id",
    "firstName",
    "lastName",
    "mobile",
    "email",
    "nationalId",
    "nationality",
    "dateOfBirth",
    "gender",
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "deletedAt",
    "deletedBy",
    "isDeleted"
)
SELECT
    s."id",
    s."firstName",
    s."lastName",
    substring('STU-' || replace(s."id"::text, '-', ''), 1, 30),
    s."email",
    NULL,
    NULL,
    NULL,
    NULL,
    s."createdAt",
    s."createdBy",
    s."updatedAt",
    s."updatedBy",
    s."deletedAt",
    s."deletedBy",
    s."isDeleted"
FROM "students" s
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "student_profiles" (
    "id",
    "personId",
    "studentNumber",
    "status",
    "idCardIssued",
    "idCardNumber",
    "joinedAt",
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "deletedAt",
    "deletedBy",
    "isDeleted"
)
SELECT
    s."id",
    s."id",
    s."studentNumber",
    'Active'::"StudentStatus",
    false,
    NULL,
    s."createdAt",
    s."createdAt",
    s."createdBy",
    s."updatedAt",
    s."updatedBy",
    s."deletedAt",
    s."deletedBy",
    s."isDeleted"
FROM "students" s
ON CONFLICT ("id") DO NOTHING;

-- Bridge the legacy admissions rows onto the new admission shape.
ALTER TABLE "admissions"
    ADD COLUMN IF NOT EXISTS "personId" UUID,
    ADD COLUMN IF NOT EXISTS "studentProfileId" UUID,
    ADD COLUMN IF NOT EXISTS "admissionStatus" "AdmissionStatus" NOT NULL DEFAULT 'Draft',
    ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "approvedBy" UUID,
    ADD COLUMN IF NOT EXISTS "remarks" TEXT;

UPDATE "admissions" a
SET
    "personId" = a."studentId",
    "studentProfileId" = a."studentId",
    "admissionStatus" = CASE a."status"
        WHEN 'Active' THEN 'Approved'
        WHEN 'Inactive' THEN 'Rejected'
        WHEN 'Archived' THEN 'Cancelled'
        ELSE 'Draft'
    END::"AdmissionStatus",
    "submittedAt" = COALESCE(a."submittedAt", a."createdAt"),
    "approvedAt" = CASE
        WHEN a."status" = 'Active' THEN COALESCE(a."approvedAt", a."createdAt")
        ELSE a."approvedAt"
    END
WHERE a."studentId" IS NOT NULL;

ALTER TABLE "admissions"
    ALTER COLUMN "personId" SET NOT NULL,
    ALTER COLUMN "studentProfileId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "admissions_personId_idx" ON "admissions"("personId");
CREATE INDEX IF NOT EXISTS "admissions_studentProfileId_idx" ON "admissions"("studentProfileId");

ALTER TABLE "student_profiles"
    ADD CONSTRAINT "student_profiles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admissions"
    ADD CONSTRAINT "admissions_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "admissions_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
