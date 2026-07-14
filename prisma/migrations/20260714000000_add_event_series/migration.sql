-- Wave 6A — event identity & recurrence.
--
-- HAND-EDITED. `prisma migrate diff` emitted
--     ALTER TABLE "Event" DROP COLUMN "isRecurring", ADD COLUMN "isPermanent" ...
-- for the rename, which would have silently zeroed all 34 rows where the flag is
-- true (Meow Wolf, the climbing gyms, the art museum) — they would have stopped
-- being always-available and started getting archived as stale. RENAME COLUMN
-- preserves the data. Do not regenerate this file from a diff.

-- AlterTable: rename, preserving data (NOT drop + add)
ALTER TABLE "Event" RENAME COLUMN "isRecurring" TO "isPermanent";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "seriesId" TEXT;

-- AlterTable
ALTER TABLE "UserItemStatus" ADD COLUMN "seriesId" TEXT;

-- AlterTable
ALTER TABLE "UserRankedEntry" ADD COLUMN "seriesId" TEXT;

-- CreateTable
CREATE TABLE "EventSeries" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "placeId" TEXT,
    "category" "Category" NOT NULL,
    "cadence" TEXT,
    "seriesKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSeries_seriesKey_key" ON "EventSeries"("seriesKey");

-- CreateIndex
CREATE INDEX "EventSeries_placeId_idx" ON "EventSeries"("placeId");

-- CreateIndex
CREATE INDEX "EventSeries_cityId_idx" ON "EventSeries"("cityId");

-- CreateIndex
CREATE INDEX "Event_seriesId_startTime_idx" ON "Event"("seriesId", "startTime");

-- Occurrence identity: an occurrence IS a (thing, time) pair.
--
-- The old key was (externalId, source) with startTime as PAYLOAD, which is what
-- let Westword's series-URL row mutate its startTime forward every night —
-- dragging a three-week-old rating onto this week's edition, and then suppressing
-- the event from that user's feed forever via the DONE hard-filter.
--
-- Safe on existing data: the new key is strictly WEAKER than the old one (adding
-- a column can only split groups, never merge them), so no current row pair can
-- violate it.
--
-- Only enforceable because ingest now synthesizes a non-null externalId: Postgres
-- treats NULLs as DISTINCT in a unique index, so while externalId could be NULL
-- this constraint was powerless to stop the very duplicates it names.
DROP INDEX "Event_externalId_source_key";

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_externalId_startTime_key" ON "Event"("source", "externalId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_seriesId_key" ON "UserItemStatus"("userId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRankedEntry_userId_seriesId_key" ON "UserRankedEntry"("userId", "seriesId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSeries" ADD CONSTRAINT "EventSeries_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "EventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
