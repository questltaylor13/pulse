-- Wave 2 Beli mechanic (been / want / rate).
--
-- Additive + safe: new columns are nullable or defaulted, so existing rows
-- backfill cleanly and no data migration is required. Apply to prod with
-- `prisma migrate deploy` (does not use a shadow database, so it's unaffected
-- by the consolidated-baseline shadow-DB issue).

-- Per-user 1–5 rating, captured alongside a DONE ("been there") status.
ALTER TABLE "UserItemStatus" ADD COLUMN "rating" INTEGER;

-- Place-level aggregate of those ratings (avg = sum / count when count > 0).
ALTER TABLE "Place" ADD COLUMN "pulseRatingSum" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Place" ADD COLUMN "pulseRatingCount" INTEGER NOT NULL DEFAULT 0;
