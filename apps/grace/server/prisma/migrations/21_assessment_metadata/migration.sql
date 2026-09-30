-- Lab: TemplatePackage customFields bag on assessments.
-- Schema had Assessment.metadata without a matching SQL migration,
-- so Docker `prisma migrate deploy` left the column missing (500 on /api/assessments).

ALTER TABLE "assessments"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';
