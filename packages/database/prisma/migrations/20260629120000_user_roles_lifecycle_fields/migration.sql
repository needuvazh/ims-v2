-- Add IAM user-role lifecycle fields that exist in the Prisma schema.
ALTER TABLE "user_roles"
ADD COLUMN "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
ADD COLUMN "revokedAt" TIMESTAMPTZ(6),
ADD COLUMN "revokedBy" UUID,
ADD COLUMN "reason" TEXT,
ADD COLUMN "updatedAt" TIMESTAMPTZ(6),
ADD COLUMN "updatedBy" UUID;
