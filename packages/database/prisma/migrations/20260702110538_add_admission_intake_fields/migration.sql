-- AlterTable
ALTER TABLE "admissions" ADD COLUMN     "cancelledAt" TIMESTAMPTZ(6),
ADD COLUMN     "cancelledBy" UUID,
ADD COLUMN     "rejectedAt" TIMESTAMPTZ(6),
ADD COLUMN     "rejectedBy" UUID;

-- Create Numbering Sequences
CREATE SEQUENCE IF NOT EXISTS student_number_seq START 10000;
CREATE SEQUENCE IF NOT EXISTS admission_number_seq START 10000;

