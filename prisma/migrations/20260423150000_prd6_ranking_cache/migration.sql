-- PRD 6 Phase 0 — Ranking engine foundations.
--
-- Adds:
--   - RankedFeedCache: per-user precomputed ranking. One row per user.
--     rankedItems holds the full ranked list as Json (array of
--     {itemType, itemId, score, reasons[]}). profileVersion + feedbackCount
--     + isDirty drive incremental invalidation for the hourly precompute
--     cron (see /api/ranking/precompute in Phase 2).
--   - RankingRun: observability table for every precompute iteration.
--     14-day retention via a dedicated cleanup cron (Phase 7).
--   - User.rankingVariant: A/B plumbing (Phase 6). Hash-assigned at
--     signup; all existing users backfilled to "control".
--   - UserProfile.version: scalar version bumped on profile write so
--     the precompute cron can detect staleness without comparing Json
--     blobs. Defaults to 1 for existing rows.

-- RankedFeedCache ----------------------------------------------------------
CREATE TABLE "RankedFeedCache" (
  "id"             TEXT        NOT NULL,
  "userId"         TEXT        NOT NULL,
  "rankedItems"    JSONB       NOT NULL,
  "computedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "profileVersion" INTEGER     NOT NULL,
  "feedbackCount"  INTEGER     NOT NULL,
  "isDirty"        BOOLEAN     NOT NULL DEFAULT false,

  CONSTRAINT "RankedFeedCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankedFeedCache_userId_key" ON "RankedFeedCache"("userId");
CREATE INDEX "RankedFeedCache_computedAt_idx" ON "RankedFeedCache"("computedAt");

ALTER TABLE "RankedFeedCache" ADD CONSTRAINT "RankedFeedCache_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RankingRun ---------------------------------------------------------------
CREATE TABLE "RankingRun" (
  "id"               TEXT         NOT NULL,
  "userId"           TEXT,
  "variant"          TEXT         NOT NULL DEFAULT 'control',
  "poolSize"         INTEGER      NOT NULL DEFAULT 0,
  "rankedCount"      INTEGER      NOT NULL DEFAULT 0,
  "serendipityCount" INTEGER      NOT NULL DEFAULT 0,
  "durationMs"       INTEGER      NOT NULL DEFAULT 0,
  "error"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RankingRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RankingRun_createdAt_idx" ON "RankingRun"("createdAt");
CREATE INDEX "RankingRun_userId_createdAt_idx" ON "RankingRun"("userId", "createdAt");

-- Intentionally no FK on RankingRun.userId — we want observability rows to
-- survive user deletion so we can debug post-hoc.

-- User.rankingVariant ------------------------------------------------------
ALTER TABLE "User" ADD COLUMN "rankingVariant" TEXT NOT NULL DEFAULT 'control';

-- UserProfile.version ------------------------------------------------------
ALTER TABLE "UserProfile" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
