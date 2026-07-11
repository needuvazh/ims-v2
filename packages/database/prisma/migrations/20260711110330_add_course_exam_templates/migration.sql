-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "courseExamTemplateId" UUID;

-- CreateTable
CREATE TABLE "course_exam_templates" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "examName" VARCHAR(200) NOT NULL,
    "maxMarks" DECIMAL(10,2) NOT NULL,
    "passMarks" DECIMAL(10,2) NOT NULL,
    "status" "ConfigStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_exam_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_exam_templates_courseId_idx" ON "course_exam_templates"("courseId");

-- CreateIndex
CREATE INDEX "exams_courseExamTemplateId_idx" ON "exams"("courseExamTemplateId");

-- AddForeignKey
ALTER TABLE "course_exam_templates" ADD CONSTRAINT "course_exam_templates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_courseExamTemplateId_fkey" FOREIGN KEY ("courseExamTemplateId") REFERENCES "course_exam_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
