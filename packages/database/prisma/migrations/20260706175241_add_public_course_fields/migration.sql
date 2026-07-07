-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "hasPracticalInstruction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPubliclyExposed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "metaTitle" VARCHAR(255),
ADD COLUMN     "practicalTestingDescription" TEXT,
ADD COLUMN     "showPricingPublicly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "syllabusOutline" TEXT;
