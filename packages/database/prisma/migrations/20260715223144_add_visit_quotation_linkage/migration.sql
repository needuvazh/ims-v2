-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "corporateMarketingVisitId" UUID;

-- CreateIndex
CREATE INDEX "quotations_corporateMarketingVisitId_idx" ON "quotations"("corporateMarketingVisitId");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_corporateMarketingVisitId_fkey" FOREIGN KEY ("corporateMarketingVisitId") REFERENCES "corporate_marketing_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
