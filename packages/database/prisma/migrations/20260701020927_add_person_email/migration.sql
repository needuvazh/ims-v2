/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `persons` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "email" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");
