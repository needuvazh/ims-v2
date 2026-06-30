/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "parentBranchId" UUID;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_parentBranchId_fkey" FOREIGN KEY ("parentBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
