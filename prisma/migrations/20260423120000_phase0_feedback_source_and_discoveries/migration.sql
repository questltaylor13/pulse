-- PRD 5 (Feedback System) — Phase 0: extend UserItemStatus to be the
-- single source of truth for behavioral feedback across Events, Places,
-- and Discoveries. See PRD/feedback-system.md.
--
-- Changes:
--   1. New FeedbackSource enum
--   2. UserItemStatus.itemId becomes nullable, FK flipped to SetNull
--   3. Add UserItemStatus.discoveryId nullable FK (SetNull to Discovery)
--   4. Add UserItemStatus.source with default LEGACY (zero-cost backfill)
--   5. Add snapshot columns + populate from joined Item for existing rows
--   6. Add unique + index for discoveryId dimension
--   7. CHECK: exactly one of itemId / discoveryId must be non-null
--
-- 438 existing rows all have itemId set — backfill runs in a single UPDATE.

-- 1. FeedbackSource enum
CREATE TYPE "FeedbackSource" AS ENUM ('FEED_CARD', 'PROFILE_SWIPER', 'DETAIL_PAGE', 'LEGACY');

-- 2. Swap itemId FK from Cascade to SetNull so snapshots survive deletion.
--    Also make itemId nullable to allow Discovery-only rows.
ALTER TABLE "UserItemStatus" DROP CONSTRAINT "UserItemStatus_itemId_fkey";
ALTER TABLE "UserItemStatus" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. discoveryId + FK
ALTER TABLE "UserItemStatus" ADD COLUMN "discoveryId" TEXT;
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_discoveryId_fkey"
  FOREIGN KEY ("discoveryId") REFERENCES "Discovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. source column — default LEGACY so existing 438 rows backfill automatically
ALTER TABLE "UserItemStatus"
  ADD COLUMN "source" "FeedbackSource" NOT NULL DEFAULT 'LEGACY';

-- 5. Denormalized snapshot columns + backfill from Item join
ALTER TABLE "UserItemStatus"
  ADD COLUMN "itemTitleSnapshot" TEXT,
  ADD COLUMN "itemCategorySnapshot" TEXT,
  ADD COLUMN "itemTownSnapshot" TEXT;

UPDATE "UserItemStatus" uis
SET
  "itemTitleSnapshot"    = i."title",
  "itemCategorySnapshot" = i."category"::text,
  "itemTownSnapshot"     = i."neighborhood"
FROM "Item" i
WHERE uis."itemId" = i."id"
  AND uis."itemTitleSnapshot" IS NULL;

-- 6. Unique + index for discoveryId
CREATE UNIQUE INDEX "UserItemStatus_userId_discoveryId_key"
  ON "UserItemStatus"("userId", "discoveryId");
CREATE INDEX "UserItemStatus_discoveryId_idx"
  ON "UserItemStatus"("discoveryId");

-- 7. Exactly-one-of CHECK. Runs last so backfilled rows (all itemId, no
--    discoveryId) satisfy the constraint immediately.
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_exactly_one_ref"
  CHECK (
    (("itemId" IS NOT NULL)::int + ("discoveryId" IS NOT NULL)::int) = 1
  );
