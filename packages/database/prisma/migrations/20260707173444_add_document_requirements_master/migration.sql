-- CreateEnum
CREATE TYPE "TargetEntity" AS ENUM ('STUDENT', 'TRAINER', 'COURSE');

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" UUID NOT NULL,
    "target_entity" "TargetEntity" NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "branch_id" UUID,
    "course_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "effective_start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_end_date" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updated_by" UUID,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_target_entity_document_type_branch_id_key" ON "document_requirements"("target_entity", "document_type", "branch_id", "course_id");

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
