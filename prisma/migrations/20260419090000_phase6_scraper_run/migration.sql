-- PRD 2 Phase 6 — ScraperRun observability table. One row per source per
-- run. Feeds /admin/scrapers coverage-health view. 30-day retention is
-- enforced by a daily cleanup cron added in this migration.

-- CreateTable
CREATE TABLE "ScraperRun" (
  "id"            TEXT NOT NULL,
  "source"        TEXT NOT NULL,
  "region"        "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
  "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationMs"    INTEGER NOT NULL,
  "rawCount"      INTEGER NOT NULL DEFAULT 0,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount"  INTEGER NOT NULL DEFAULT 0,
  "enrichedCount" INTEGER NOT NULL DEFAULT 0,
  "droppedCount"  INTEGER NOT NULL DEFAULT 0,
  "errorCount"    INTEGER NOT NULL DEFAULT 0,
  "errors"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "succeeded"     BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScraperRun_source_startedAt_idx" ON "ScraperRun"("source", "startedAt");
CREATE INDEX "ScraperRun_startedAt_idx" ON "ScraperRun"("startedAt");
