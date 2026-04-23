-- PRD 4 (Psychographic Onboarding) — Phase 0: additive UserProfile columns.
-- Option A scope: ADD the two Q5 aspiration fields the ranking engine
-- (PRD 5 / signal-map.md) needs. The enum rename `SocialStyleType` →
-- `SocialStyle` and the removal of planningStyle / sparkResponse /
-- opennessScore / extraversionScore / noveltyScore are deferred to Phase 1,
-- when the legacy /onboarding route + lib/onboarding/* files can be
-- replaced wholesale by the new /onboarding-v2 flow.
--
-- Safe against live DB: UserProfile is empty (0 rows at time of write).
-- Even with rows, `aspirationCategories` has an array default so the
-- NOT NULL constraint would not require a data backfill.

-- AlterTable
ALTER TABLE "UserProfile"
  ADD COLUMN "aspirationCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "aspirationText" TEXT;
