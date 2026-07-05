CREATE TABLE "trainer_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "personId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "trainerCode" VARCHAR(50) NOT NULL,
    "trainerType" VARCHAR(50) NOT NULL,
    "specialization" VARCHAR(500) NOT NULL,
    "qualificationSummary" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Inactive',
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "trainer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trainer_profiles_personId_key" ON "trainer_profiles"("personId");
CREATE UNIQUE INDEX "trainer_profiles_trainerCode_key" ON "trainer_profiles"("trainerCode");
CREATE INDEX "trainer_profiles_branchId_idx" ON "trainer_profiles"("branchId");
CREATE INDEX "trainer_profiles_status_idx" ON "trainer_profiles"("status");
CREATE INDEX "trainer_profiles_trainerType_idx" ON "trainer_profiles"("trainerType");
CREATE INDEX "trainer_profiles_effectiveStartDate_idx" ON "trainer_profiles"("effectiveStartDate");

CREATE TABLE "trainer_qualifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainerId" UUID NOT NULL,
    "qualificationName" VARCHAR(200) NOT NULL,
    "institution" VARCHAR(200) NOT NULL,
    "yearCompleted" INTEGER NOT NULL,
    "documentId" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "effectiveStartDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "trainer_qualifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainer_qualifications_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trainer_qualifications_trainerId_idx" ON "trainer_qualifications"("trainerId");
CREATE INDEX "trainer_qualifications_status_idx" ON "trainer_qualifications"("status");
CREATE INDEX "trainer_qualifications_yearCompleted_idx" ON "trainer_qualifications"("yearCompleted");

CREATE TABLE "trainer_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainerId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dayOfWeek" VARCHAR(20) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "trainer_availability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainer_availability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trainer_availability_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trainer_availability_trainerId_idx" ON "trainer_availability"("trainerId");
CREATE INDEX "trainer_availability_branchId_idx" ON "trainer_availability"("branchId");
CREATE INDEX "trainer_availability_dayOfWeek_idx" ON "trainer_availability"("dayOfWeek");

CREATE TABLE "trainer_course_authorizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainerId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "trainer_course_authorizations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainer_course_authorizations_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trainer_course_authorizations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trainer_course_authorizations_trainerId_idx" ON "trainer_course_authorizations"("trainerId");
CREATE INDEX "trainer_course_authorizations_courseId_idx" ON "trainer_course_authorizations"("courseId");
CREATE INDEX "trainer_course_authorizations_status_idx" ON "trainer_course_authorizations"("status");

CREATE TABLE "trainer_compensation_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainerId" UUID NOT NULL,
    "batchId" UUID,
    "sessionId" UUID,
    "paymentBasis" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'OMR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "remarks" TEXT,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "trainer_compensation_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trainer_compensation_rates_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trainer_compensation_rates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trainer_compensation_rates_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "trainer_compensation_rates_trainerId_idx" ON "trainer_compensation_rates"("trainerId");
CREATE INDEX "trainer_compensation_rates_batchId_idx" ON "trainer_compensation_rates"("batchId");
CREATE INDEX "trainer_compensation_rates_sessionId_idx" ON "trainer_compensation_rates"("sessionId");
CREATE INDEX "trainer_compensation_rates_status_idx" ON "trainer_compensation_rates"("status");

