-- Wave 3 — GeocodeCache: durable, no-expiry cache for venue-name geocodes.
--
-- Additive + safe: brand-new table, no data migration. Apply to prod with
-- `prisma migrate deploy` (does not use a shadow database, so it's unaffected
-- by the consolidated-baseline shadow-DB issue).

CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "formattedAddress" TEXT,
    "locationType" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeocodeCache_normalizedName_key" ON "GeocodeCache"("normalizedName");
