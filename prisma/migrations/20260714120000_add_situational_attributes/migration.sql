-- Wave 6B — situational attributes on Place.
--
-- Booleans rather than tags. The tag vocabularies are the problem this wave is
-- fixing, not a mechanism to build on. Indexed columns are the ones the browse
-- `placeFlag` default is allowed to query.
--
-- All five are additive with defaults, so this is safe to apply ahead of the
-- code deploy: existing rows get the default and nothing reads the columns yet.
-- They stay false until the enrichment backfill populates them.

ALTER TABLE "Place" ADD COLUMN "goodForWatchingSports" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Place" ADD COLUMN "isKidFriendly"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Place" ADD COLUMN "hasOutdoorSeating"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Place" ADD COLUMN "hasIndoorSeating"      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Place" ADD COLUMN "fitsLargeGroups"       BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Place_goodForWatchingSports_idx" ON "Place"("goodForWatchingSports");
CREATE INDEX "Place_isKidFriendly_idx"         ON "Place"("isKidFriendly");
CREATE INDEX "Place_fitsLargeGroups_idx"       ON "Place"("fitsLargeGroups");
