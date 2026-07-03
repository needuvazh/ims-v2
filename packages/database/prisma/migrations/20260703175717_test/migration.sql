-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('Draft', 'Active', 'Closed', 'Archived');

-- CreateEnum
CREATE TYPE "HolidayStatus" AS ENUM ('Draft', 'Active', 'Inactive', 'Cancelled', 'Archived');

-- CreateTable
CREATE TABLE "business_calendars" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "nameLocalized" JSONB,
    "year" INTEGER NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "status" "CalendarStatus" NOT NULL DEFAULT 'Draft',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_calendar_overrides" (
    "id" UUID NOT NULL,
    "businessCalendarId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "name" VARCHAR(160),
    "nameLocalized" JSONB,
    "effectiveStartDate" DATE NOT NULL,
    "effectiveEndDate" DATE,
    "status" "CalendarStatus" NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "branch_calendar_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_operating_days" (
    "id" UUID NOT NULL,
    "businessCalendarId" UUID,
    "branchCalendarOverrideId" UUID,
    "dayOfWeek" VARCHAR(20) NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "calendar_operating_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_working_hours" (
    "id" UUID NOT NULL,
    "operatingDayId" UUID NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "calendar_working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "businessCalendarId" UUID NOT NULL,
    "branchCalendarOverrideId" UUID,
    "branchId" UUID,
    "date" DATE NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "nameLocalized" JSONB NOT NULL,
    "holidayType" VARCHAR(50) NOT NULL,
    "affectsScheduling" BOOLEAN NOT NULL DEFAULT true,
    "status" "HolidayStatus" NOT NULL DEFAULT 'Draft',
    "description" TEXT,
    "overridePolicy" VARCHAR(50) NOT NULL DEFAULT 'MANAGER_APPROVAL_ALLOWED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_calendars_instituteId_year_idx" ON "business_calendars"("instituteId", "year");

-- CreateIndex
CREATE INDEX "business_calendars_instituteId_status_idx" ON "business_calendars"("instituteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendars_instituteId_code_key" ON "business_calendars"("instituteId", "code");

-- CreateIndex
CREATE INDEX "branch_calendar_overrides_branchId_year_idx" ON "branch_calendar_overrides"("branchId", "year");

-- CreateIndex
CREATE INDEX "branch_calendar_overrides_businessCalendarId_idx" ON "branch_calendar_overrides"("businessCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_calendar_overrides_businessCalendarId_branchId_year_key" ON "branch_calendar_overrides"("businessCalendarId", "branchId", "year");

-- CreateIndex
CREATE INDEX "calendar_operating_days_businessCalendarId_dayOfWeek_idx" ON "calendar_operating_days"("businessCalendarId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "calendar_operating_days_branchCalendarOverrideId_dayOfWeek_idx" ON "calendar_operating_days"("branchCalendarOverrideId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "calendar_working_hours_operatingDayId_idx" ON "calendar_working_hours"("operatingDayId");

-- CreateIndex
CREATE INDEX "holidays_businessCalendarId_date_idx" ON "holidays"("businessCalendarId", "date");

-- CreateIndex
CREATE INDEX "holidays_branchId_date_idx" ON "holidays"("branchId", "date");

-- AddForeignKey
ALTER TABLE "business_calendars" ADD CONSTRAINT "business_calendars_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_calendar_overrides" ADD CONSTRAINT "branch_calendar_overrides_businessCalendarId_fkey" FOREIGN KEY ("businessCalendarId") REFERENCES "business_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_calendar_overrides" ADD CONSTRAINT "branch_calendar_overrides_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_operating_days" ADD CONSTRAINT "calendar_operating_days_businessCalendarId_fkey" FOREIGN KEY ("businessCalendarId") REFERENCES "business_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_operating_days" ADD CONSTRAINT "calendar_operating_days_branchCalendarOverrideId_fkey" FOREIGN KEY ("branchCalendarOverrideId") REFERENCES "branch_calendar_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_working_hours" ADD CONSTRAINT "calendar_working_hours_operatingDayId_fkey" FOREIGN KEY ("operatingDayId") REFERENCES "calendar_operating_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_businessCalendarId_fkey" FOREIGN KEY ("businessCalendarId") REFERENCES "business_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_branchCalendarOverrideId_fkey" FOREIGN KEY ("branchCalendarOverrideId") REFERENCES "branch_calendar_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
