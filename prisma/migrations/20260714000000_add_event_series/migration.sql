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

-- Occurrence date: the Denver CALENDAR DAY of startTime.
--
-- The day, not the instant. Sources wobble the reported start time (7:00pm one
-- night, 7:05pm on the next scrape). Keying occurrence identity on the exact
-- timestamp would mint a fresh duplicate row every single night — the same bug
-- in a different hat.
ALTER TABLE "Event" ADD COLUMN "occurrenceDate" DATE;

-- Backfill from existing startTimes so the unique index below can be built.
--
-- The double AT TIME ZONE is not redundant — it is the whole correctness of this
-- statement. "startTime" is `timestamp WITHOUT time zone` holding a UTC instant.
-- Postgres's `timestamp AT TIME ZONE z` overload INTERPRETS the naive value as
-- being in z and returns timestamptz; it does not convert INTO z. So the single
-- form `("startTime" AT TIME ZONE 'America/Denver')` reads a UTC instant as if it
-- were Denver wall-clock and shifts it the WRONG WAY (+6h instead of -6h).
--
-- That would date every event starting between noon and midnight Denver — i.e.
-- almost every event in an evenings-and-nightlife app — one day late, so the
-- nightly upsert would miss its own rows and duplicate all of them. The bug this
-- migration exists to kill, shipped inside the migration.
--
-- First AT TIME ZONE 'UTC': tag the naive value as the UTC instant it is.
-- Second AT TIME ZONE 'America/Denver': convert that instant to Denver local.
UPDATE "Event"
SET "occurrenceDate" = (("startTime" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Denver')::date
WHERE "occurrenceDate" IS NULL;

-- Derived series identity, stored so recurrence can be detected across NIGHTS
-- rather than only within one scrape batch. Left NULL by the migration and
-- populated by ingest + `npm run series:backfill` (the derivation is a TS regex,
-- not expressible in SQL).
ALTER TABLE "Event" ADD COLUMN "seriesKey" TEXT;
CREATE INDEX "Event_seriesKey_idx" ON "Event"("seriesKey");

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
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
-- violate it — and existing rows keep their externalId, so nothing is re-keyed.
--
-- Only enforceable because ingest now synthesizes a non-null externalId: Postgres
-- treats NULLs as DISTINCT in a unique index, so while externalId could be NULL
-- this constraint was powerless to stop the very duplicates it names.
DROP INDEX "Event_externalId_source_key";

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_externalId_occurrenceDate_key" ON "Event"("source", "externalId", "occurrenceDate");

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
