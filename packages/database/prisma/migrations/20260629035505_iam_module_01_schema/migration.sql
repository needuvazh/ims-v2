/*
  Warnings:

  - The values [DataScope] on the enum `PermissionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [Draft,Inactive] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actorId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `occurredAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `login_history` table. All the data in the column will be lost.
  - You are about to drop the column `occurredAt` on the `login_history` table. All the data in the column will be lost.
  - You are about to drop the column `failedLoginAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lockoutUntil` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `user_data_scopes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[personId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `attemptedEmail` to the `login_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('New', 'Contacted', 'Interested', 'Qualified', 'Converted', 'Dropped');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WalkIn', 'Web', 'Campaign', 'Referral', 'Other');

-- AlterEnum
BEGIN;
CREATE TYPE "PermissionType_new" AS ENUM ('Module', 'Menu', 'Action', 'Report');
ALTER TABLE "public"."permissions" ALTER COLUMN "permissionType" DROP DEFAULT;
ALTER TABLE "permissions" ALTER COLUMN "permissionType" TYPE "PermissionType_new" USING ("permissionType"::text::"PermissionType_new");
ALTER TYPE "PermissionType" RENAME TO "PermissionType_old";
ALTER TYPE "PermissionType_new" RENAME TO "PermissionType";
DROP TYPE "public"."PermissionType_old";
ALTER TABLE "permissions" ALTER COLUMN "permissionType" SET DEFAULT 'Action';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('PendingActivation', 'Active', 'Locked', 'Suspended', 'Archived');
ALTER TABLE "public"."users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'Active';
COMMIT;

-- DropForeignKey
ALTER TABLE "user_data_scopes" DROP CONSTRAINT "user_data_scopes_branchId_fkey";

-- DropForeignKey
ALTER TABLE "user_data_scopes" DROP CONSTRAINT "user_data_scopes_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "user_data_scopes" DROP CONSTRAINT "user_data_scopes_userId_fkey";

-- DropIndex
DROP INDEX "audit_logs_action_idx";

-- DropIndex
DROP INDEX "audit_logs_actorId_idx";

-- DropIndex
DROP INDEX "audit_logs_occurredAt_idx";

-- DropIndex
DROP INDEX "login_history_email_idx";

-- DropIndex
DROP INDEX "login_history_occurredAt_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "actorId",
DROP COLUMN "details",
DROP COLUMN "occurredAt",
ADD COLUMN     "correlationId" VARCHAR(100),
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "module" VARCHAR(100),
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "oldValue" JSONB,
ADD COLUMN     "performedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "performedBy" UUID,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "login_history" DROP COLUMN "email",
DROP COLUMN "occurredAt",
ADD COLUMN     "attemptedEmail" VARCHAR(255) NOT NULL,
ADD COLUMN     "branchId" UUID,
ADD COLUMN     "browser" VARCHAR(100),
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "device" VARCHAR(100),
ADD COLUMN     "os" VARCHAR(100);

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "activeBranchId" UUID;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "failedLoginAttempts",
DROP COLUMN "fullName",
DROP COLUMN "lockoutUntil",
DROP COLUMN "phone",
ADD COLUMN     "defaultBranchId" UUID,
ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMPTZ(6),
ADD COLUMN     "passwordChangedAt" TIMESTAMPTZ(6),
ADD COLUMN     "personId" UUID NOT NULL,
ADD COLUMN     "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
ADD COLUMN     "username" VARCHAR(100) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "user_data_scopes";

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "mobile" VARCHAR(30) NOT NULL,
    "nationalId" VARCHAR(50),
    "nationality" VARCHAR(50),
    "dateOfBirth" DATE,
    "gender" VARCHAR(20),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branch_access" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "includeChildBranches" BOOLEAN NOT NULL DEFAULT false,
    "consolidatedVisibility" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "revokedBy" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,

    CONSTRAINT "user_branch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activation_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_policies" (
    "id" UUID NOT NULL,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireLowercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireNumbers" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSpecial" BOOLEAN NOT NULL DEFAULT true,
    "passwordHistoryCount" INTEGER NOT NULL DEFAULT 5,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "resetTokenExpiryMinutes" INTEGER NOT NULL DEFAULT 15,
    "accessTokenExpiryMinutes" INTEGER NOT NULL DEFAULT 15,
    "refreshTokenExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "rememberMeRefreshTokenDays" INTEGER NOT NULL DEFAULT 30,
    "sessionInactivityMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxConcurrentSessions" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "recipientUserId" UUID,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "reportType" VARCHAR(150) NOT NULL,
    "requestedBy" UUID NOT NULL,
    "branchId" UUID,
    "filters" JSONB,
    "format" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "fileUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "stage" "LeadStage" NOT NULL DEFAULT 'New',
    "source" "LeadSource" NOT NULL DEFAULT 'Other',
    "counselorId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_follow_ups" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "counselorId" UUID NOT NULL,
    "notes" TEXT NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "studentNumber" VARCHAR(50) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "admissionDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "leadId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_mobile_key" ON "persons"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "user_branch_access_userId_branchId_key" ON "user_branch_access"("userId", "branchId");

-- CreateIndex
CREATE INDEX "password_history_userId_idx" ON "password_history"("userId");

-- CreateIndex
CREATE INDEX "user_activation_tokens_tokenHash_status_idx" ON "user_activation_tokens"("tokenHash", "status");

-- CreateIndex
CREATE INDEX "leads_branchId_idx" ON "leads"("branchId");

-- CreateIndex
CREATE INDEX "leads_counselorId_idx" ON "leads"("counselorId");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "lead_follow_ups_leadId_idx" ON "lead_follow_ups"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentNumber_key" ON "students"("studentNumber");

-- CreateIndex
CREATE INDEX "students_email_idx" ON "students"("email");

-- CreateIndex
CREATE INDEX "students_phone_idx" ON "students"("phone");

-- CreateIndex
CREATE INDEX "admissions_studentId_idx" ON "admissions"("studentId");

-- CreateIndex
CREATE INDEX "admissions_branchId_idx" ON "admissions"("branchId");

-- CreateIndex
CREATE INDEX "audit_logs_performedBy_idx" ON "audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "audit_logs_performedAt_idx" ON "audit_logs"("performedAt");

-- CreateIndex
CREATE INDEX "audit_logs_branchId_idx" ON "audit_logs"("branchId");

-- CreateIndex
CREATE INDEX "login_history_attemptedEmail_idx" ON "login_history"("attemptedEmail");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_status_idx" ON "user_sessions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_personId_key" ON "users"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activation_tokens" ADD CONSTRAINT "user_activation_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
