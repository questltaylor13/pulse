-- PRD 2 (Regional Expansion) — Phase 0: Regional metadata fields + enum.
-- Adds shared geography/drive-time metadata to Event and Place so the home
-- feed can distinguish Denver metro, Front Range, Mountain Gateway, and
-- Mountain Destination content without relying on a hardcoded neighborhood
-- whitelist. All existing rows default to DENVER_METRO; a backfill script
-- reclassifies rows whose `neighborhood` matches a known non-Denver town.

-- CreateEnum
CREATE TYPE "EventRegion" AS ENUM ('DENVER_METRO', 'FRONT_RANGE', 'MOUNTAIN_GATEWAY', 'MOUNTAIN_DEST');

-- AlterTable: Event
ALTER TABLE "Event"
  ADD COLUMN "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
  ADD COLUMN "townName" TEXT,
  ADD COLUMN "isDayTrip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isWeekendTrip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "driveNote" TEXT,
  ADD COLUMN "worthTheDriveScore" INTEGER;

-- AlterTable: Place
ALTER TABLE "Place"
  ADD COLUMN "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
  ADD COLUMN "townName" TEXT,
  ADD COLUMN "isDayTrip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isWeekendTrip" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "driveTimeFromDenver" INTEGER,
  ADD COLUMN "driveNote" TEXT;

-- CreateIndex: Event
CREATE INDEX "Event_region_startTime_idx" ON "Event"("region", "startTime");

-- CreateIndex: Place
CREATE INDEX "Place_region_idx" ON "Place"("region");
