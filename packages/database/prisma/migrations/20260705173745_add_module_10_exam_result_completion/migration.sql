-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('Draft', 'Scheduled', 'OpenForResultEntry', 'Closed', 'Cancelled', 'Archived');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('Pending', 'Recorded', 'Finalized', 'Corrected');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('Pending', 'EvidenceIncomplete', 'AwaitingTrainerRecommendation', 'AwaitingCoordinatorReview', 'AwaitingFinalApproval', 'Approved', 'Rejected', 'ReevaluationRequired', 'ExceptionReview');

-- CreateEnum
CREATE TYPE "ApprovalLevel" AS ENUM ('TrainerRecommendation', 'CoordinatorReview', 'FinalApproval');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "examName" VARCHAR(200) NOT NULL,
    "examDate" DATE NOT NULL,
    "maxMarks" DECIMAL(10,2) NOT NULL,
    "passMarks" DECIMAL(10,2) NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'Draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "examId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "marksObtained" DECIMAL(10,2) NOT NULL,
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'Pending',
    "grade" VARCHAR(20),
    "finalizedAt" TIMESTAMPTZ(6),
    "finalizedBy" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_completions" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "attendancePercentage" DECIMAL(5,2),
    "attendanceOutcome" VARCHAR(30),
    "examRequired" BOOLEAN NOT NULL DEFAULT false,
    "examOutcome" VARCHAR(30),
    "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    "paymentOutcome" VARCHAR(30),
    "manualApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "completionStatus" "CompletionStatus" NOT NULL DEFAULT 'Pending',
    "certificateAllowed" BOOLEAN NOT NULL DEFAULT false,
    "attendanceUpdatedAt" TIMESTAMPTZ(6),
    "resultUpdatedAt" TIMESTAMPTZ(6),
    "paymentUpdatedAt" TIMESTAMPTZ(6),
    "lastEvaluatedAt" TIMESTAMPTZ(6),
    "evidenceStale" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completion_approvals" (
    "id" UUID NOT NULL,
    "courseCompletionId" UUID NOT NULL,
    "approvalLevel" "ApprovalLevel" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'Pending',
    "actorId" UUID NOT NULL,
    "actionDate" TIMESTAMPTZ(6),
    "remarks" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "completion_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_batchId_status_idx" ON "exams"("batchId", "status");

-- CreateIndex
CREATE INDEX "exams_courseId_idx" ON "exams"("courseId");

-- CreateIndex
CREATE INDEX "exams_examDate_idx" ON "exams"("examDate");

-- CreateIndex
CREATE INDEX "results_examId_enrollmentId_idx" ON "results"("examId", "enrollmentId");

-- CreateIndex
CREATE INDEX "results_enrollmentId_idx" ON "results"("enrollmentId");

-- CreateIndex
CREATE INDEX "results_resultStatus_idx" ON "results"("resultStatus");

-- CreateIndex
CREATE UNIQUE INDEX "results_examId_enrollmentId_key" ON "results"("examId", "enrollmentId");

-- CreateIndex
CREATE INDEX "course_completions_enrollmentId_completionStatus_idx" ON "course_completions"("enrollmentId", "completionStatus");

-- CreateIndex
CREATE INDEX "course_completions_completionStatus_idx" ON "course_completions"("completionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "course_completions_enrollmentId_key" ON "course_completions"("enrollmentId");

-- CreateIndex
CREATE INDEX "completion_approvals_courseCompletionId_approvalLevel_idx" ON "completion_approvals"("courseCompletionId", "approvalLevel");

-- CreateIndex
CREATE INDEX "completion_approvals_courseCompletionId_idx" ON "completion_approvals"("courseCompletionId");

-- CreateIndex
CREATE INDEX "completion_approvals_actorId_idx" ON "completion_approvals"("actorId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_approvals" ADD CONSTRAINT "completion_approvals_courseCompletionId_fkey" FOREIGN KEY ("courseCompletionId") REFERENCES "course_completions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
