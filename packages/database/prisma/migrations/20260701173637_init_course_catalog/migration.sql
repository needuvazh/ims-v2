/*
  Warnings:

  - You are about to drop the column `name` on the `courses` table. All the data in the column will be lost.
  - Added the required column `courseClassification` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentId` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationType` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationValue` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `effectiveStartDate` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameArabic` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEnglish` to the `courses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "courses" DROP COLUMN "name",
ADD COLUMN     "allowWalkInCompletion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "courseClassification" VARCHAR(50) NOT NULL,
ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "deletedAt" TIMESTAMPTZ(6),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "departmentId" UUID NOT NULL,
ADD COLUMN     "descriptionArabic" TEXT,
ADD COLUMN     "descriptionEnglish" TEXT,
ADD COLUMN     "durationType" VARCHAR(50) NOT NULL,
ADD COLUMN     "durationValue" INTEGER NOT NULL,
ADD COLUMN     "effectiveEndDate" DATE,
ADD COLUMN     "effectiveStartDate" DATE NOT NULL,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameArabic" VARCHAR(150) NOT NULL,
ADD COLUMN     "nameEnglish" VARCHAR(150) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(6),
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'Draft';

-- CreateTable
CREATE TABLE "course_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "nameEnglish" VARCHAR(150) NOT NULL,
    "nameArabic" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "parentCategoryId" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_pricings" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_pricings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_completion_rules" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_completion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_categories_code_key" ON "course_categories"("code");

-- CreateIndex
CREATE INDEX "courses_categoryId_idx" ON "courses"("categoryId");

-- CreateIndex
CREATE INDEX "courses_departmentId_idx" ON "courses"("departmentId");

-- AddForeignKey
ALTER TABLE "course_categories" ADD CONSTRAINT "course_categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "course_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_pricings" ADD CONSTRAINT "course_pricings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completion_rules" ADD CONSTRAINT "course_completion_rules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "course_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
