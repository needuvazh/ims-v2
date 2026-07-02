-- CreateTable
CREATE TABLE "walk_in_payments" (
    "id" UUID NOT NULL,
    "walkInEnrollmentId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "referenceNumber" VARCHAR(100),
    "receivedBy" UUID NOT NULL,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMPTZ(6),
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(6),
    "deletedBy" UUID,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "walk_in_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_payments_walkInEnrollmentId_key" ON "walk_in_payments"("walkInEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_payments_enrollmentId_key" ON "walk_in_payments"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "walk_in_payments_referenceNumber_key" ON "walk_in_payments"("referenceNumber");

-- CreateIndex
CREATE INDEX "walk_in_payments_walkInEnrollmentId_idx" ON "walk_in_payments"("walkInEnrollmentId");

-- CreateIndex
CREATE INDEX "walk_in_payments_enrollmentId_idx" ON "walk_in_payments"("enrollmentId");

-- AddForeignKey
ALTER TABLE "walk_in_payments" ADD CONSTRAINT "walk_in_payments_walkInEnrollmentId_fkey" FOREIGN KEY ("walkInEnrollmentId") REFERENCES "walk_in_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_in_payments" ADD CONSTRAINT "walk_in_payments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
