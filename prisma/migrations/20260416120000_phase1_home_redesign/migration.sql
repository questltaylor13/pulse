-- Phase 1 home redesign: add editorial flags, archive flag, drive time, Place tags.

-- Event additions
ALTER TABLE "Event" ADD COLUMN "isEditorsPick" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "driveTimeFromDenver" INTEGER;
ALTER TABLE "Event" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_isEditorsPick_idx" ON "Event"("isEditorsPick");
CREATE INDEX "Event_isArchived_startTime_idx" ON "Event"("isArchived", "startTime");

-- Place additions
ALTER TABLE "Place" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- GIN indexes for array tag filtering (used by category rail "weird"/"off-beat" filters)
CREATE INDEX "Event_tags_gin_idx" ON "Event" USING GIN ("tags");
CREATE INDEX "Place_tags_gin_idx" ON "Place" USING GIN ("tags");

-- Backfill: archive past non-recurring events so the home feed is clean immediately
UPDATE "Event"
SET "isArchived" = true
WHERE "startTime" < NOW() - INTERVAL '2 hours'
  AND "isRecurring" = false;
