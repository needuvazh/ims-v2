-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "expiryDate" DATE,
ADD COLUMN     "issueDate" DATE,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
