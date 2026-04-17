-- Phase 3: Guides tab

ALTER TABLE "Influencer" ADD COLUMN "isFeaturedCreator" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Influencer" ADD COLUMN "guideCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Influencer" ADD COLUMN "coverImageUrl" TEXT;
CREATE INDEX "Influencer_isFeaturedCreator_idx" ON "Influencer"("isFeaturedCreator");

CREATE TABLE "Guide" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "tagline" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "description" TEXT NOT NULL,
  "durationLabel" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "neighborhoodHub" TEXT,
  "costRangeLabel" TEXT NOT NULL,
  "occasionTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "vibeTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "saveCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "creatorId" TEXT NOT NULL,
  CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");
CREATE INDEX "Guide_isPublished_isFeatured_idx" ON "Guide"("isPublished", "isFeatured");
CREATE INDEX "Guide_creatorId_idx" ON "Guide"("creatorId");
CREATE INDEX "Guide_occasionTags_gin_idx" ON "Guide" USING GIN ("occasionTags");
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GuideStop" (
  "id" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "timeWindowStart" TEXT,
  "timeWindowEnd" TEXT,
  "note" TEXT NOT NULL,
  "insiderTip" TEXT,
  "walkTimeToNext" INTEGER,
  "walkTimeComputedAt" TIMESTAMP(3),
  "guideId" TEXT NOT NULL,
  "eventId" TEXT,
  "placeId" TEXT,
  CONSTRAINT "GuideStop_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GuideStop_guideId_order_idx" ON "GuideStop"("guideId", "order");
CREATE INDEX "GuideStop_eventId_idx" ON "GuideStop"("eventId");
CREATE INDEX "GuideStop_placeId_idx" ON "GuideStop"("placeId");
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuideStop" ADD CONSTRAINT "GuideStop_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserSavedGuide" (
  "userId" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSavedGuide_pkey" PRIMARY KEY ("userId", "guideId")
);
CREATE INDEX "UserSavedGuide_userId_idx" ON "UserSavedGuide"("userId");
ALTER TABLE "UserSavedGuide" ADD CONSTRAINT "UserSavedGuide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSavedGuide" ADD CONSTRAINT "UserSavedGuide_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
