-- Phase 2: Places tab additions

ALTER TABLE "Place" ADD COLUMN "isLocalFavorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Place" ADD COLUMN "touristTrapScore" DOUBLE PRECISION;
ALTER TABLE "Place" ADD COLUMN "goodForWorking"  BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Place_isLocalFavorite_idx" ON "Place"("isLocalFavorite");
CREATE INDEX "Place_goodForWorking_idx"  ON "Place"("goodForWorking");

CREATE TABLE "Neighborhood" (
  "id"            TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "placeCount"    INTEGER NOT NULL DEFAULT 0,
  "isFeatured"    BOOLEAN NOT NULL DEFAULT false,
  "displayOrder"  INTEGER NOT NULL DEFAULT 100,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Neighborhood_slug_key" ON "Neighborhood"("slug");
CREATE INDEX "Neighborhood_isFeatured_displayOrder_idx" ON "Neighborhood"("isFeatured", "displayOrder");
