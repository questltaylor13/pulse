-- PRD 5 Phase 1 — let UserItemStatus reference Events and Places directly.
--
-- The Phase 0 migration reused the Item polymorphic bridge (Item.id) for
-- Event/Place feedback. Works for the legacy /lists UI that already knew
-- bridge IDs, but the new three-dot menu on compact cards only has native
-- Event.id / Place.id. Adding direct FKs lets the card menu write + the
-- feed read in a single query each, no lazy-bridge step.
--
-- Legacy rows (438) that pre-date PRD 5 keep their itemId populated and
-- work through the Item bridge exactly as before. New Phase 1 writes
-- populate eventId OR placeId instead, leaving itemId null. The CHECK
-- constraint is updated to accept any single one of the four FK columns.

-- Drop the Phase 0 CHECK so we can re-add a wider version below
ALTER TABLE "UserItemStatus" DROP CONSTRAINT "UserItemStatus_exactly_one_ref";

-- Add eventId + placeId nullable FKs (SetNull preserves snapshots)
ALTER TABLE "UserItemStatus" ADD COLUMN "eventId" TEXT;
ALTER TABLE "UserItemStatus" ADD COLUMN "placeId" TEXT;

ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique + index per dimension
CREATE UNIQUE INDEX "UserItemStatus_userId_eventId_key"
  ON "UserItemStatus"("userId", "eventId");
CREATE UNIQUE INDEX "UserItemStatus_userId_placeId_key"
  ON "UserItemStatus"("userId", "placeId");
CREATE INDEX "UserItemStatus_eventId_idx" ON "UserItemStatus"("eventId");
CREATE INDEX "UserItemStatus_placeId_idx" ON "UserItemStatus"("placeId");

-- Re-add CHECK: exactly one of the four ref columns must be non-null
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_exactly_one_ref"
  CHECK (
    (("itemId" IS NOT NULL)::int
      + ("eventId" IS NOT NULL)::int
      + ("placeId" IS NOT NULL)::int
      + ("discoveryId" IS NOT NULL)::int) = 1
  );
