-- Add coverageAnomaly observability flag to ScraperRun.
-- Set to true at the end of a run when rawCount < 50% of the source's
-- 14-day rolling median AND ≥7 succeeded runs exist in the window AND
-- median ≥5. The cold-start guards prevent false positives during low-
-- data periods and right after a coverage-fix volume jump retrains the
-- median.
ALTER TABLE "ScraperRun" ADD COLUMN "coverageAnomaly" BOOLEAN NOT NULL DEFAULT false;
