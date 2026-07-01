-- CreateTable
CREATE TABLE "lead_stage_history" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "oldStage" "LeadStage" NOT NULL,
    "newStage" "LeadStage" NOT NULL,
    "lostReasonCode" VARCHAR(50),
    "lostReasonNotes" TEXT,
    "performedBy" UUID NOT NULL,
    "performedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_stage_history_leadId_idx" ON "lead_stage_history"("leadId");

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_stage_history" ADD CONSTRAINT "lead_stage_history_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
