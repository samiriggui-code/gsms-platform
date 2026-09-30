-- AlterEnum RecordSource
ALTER TYPE "RecordSource" ADD VALUE 'FORM';
ALTER TYPE "RecordSource" ADD VALUE 'API';

-- AlterTable company
ALTER TABLE "company" ADD COLUMN "sourceSystem" TEXT;
ALTER TABLE "company" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "company_source_external_key" ON "company"("sourceSystem", "externalId");

-- AlterTable contact
ALTER TABLE "contact" ADD COLUMN "sourceSystem" TEXT;
ALTER TABLE "contact" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "contact_source_external_key" ON "contact"("sourceSystem", "externalId");

-- AlterTable deal
ALTER TABLE "deal" ADD COLUMN "source" "RecordSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "deal" ADD COLUMN "sourceSystem" TEXT;
ALTER TABLE "deal" ADD COLUMN "externalId" TEXT;
CREATE UNIQUE INDEX "deal_source_external_key" ON "deal"("sourceSystem", "externalId");
