-- Backfill range columns from the existing single-day block date.
ALTER TABLE "venue_blocks"
  ADD COLUMN "blockStartDate" DATE,
  ADD COLUMN "blockEndDate" DATE;

UPDATE "venue_blocks"
SET
  "blockStartDate" = "blockDate",
  "blockEndDate" = "blockDate"
WHERE "blockStartDate" IS NULL
  OR "blockEndDate" IS NULL;

ALTER TABLE "venue_blocks"
  ALTER COLUMN "blockStartDate" SET NOT NULL,
  ALTER COLUMN "blockEndDate" SET NOT NULL;

CREATE INDEX "venue_blocks_branchId_blockStartDate_blockEndDate_idx"
  ON "venue_blocks"("branchId", "blockStartDate", "blockEndDate");

CREATE INDEX "venue_blocks_classroomId_blockStartDate_blockEndDate_idx"
  ON "venue_blocks"("classroomId", "blockStartDate", "blockEndDate");

DROP INDEX IF EXISTS "venue_blocks_branchId_blockDate_idx";
DROP INDEX IF EXISTS "venue_blocks_classroomId_blockDate_idx";

ALTER TABLE "venue_blocks" DROP COLUMN "blockDate";
