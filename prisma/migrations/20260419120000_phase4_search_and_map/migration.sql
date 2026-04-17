-- Phase 4: Search overlay + map support

ALTER TABLE "Event" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "lng" DOUBLE PRECISION;
CREATE INDEX "Event_lat_lng_idx" ON "Event"("lat", "lng");

CREATE TABLE "UserSearchHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "resultsCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSearchHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserSearchHistory_userId_createdAt_idx" ON "UserSearchHistory"("userId", "createdAt");
ALTER TABLE "UserSearchHistory" ADD CONSTRAINT "UserSearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill Event lat/lng from linked Place
UPDATE "Event" e
SET "lat" = p."lat", "lng" = p."lng"
FROM "Place" p
WHERE e."placeId" = p."id" AND p."lat" IS NOT NULL AND p."lng" IS NOT NULL AND e."lat" IS NULL;
