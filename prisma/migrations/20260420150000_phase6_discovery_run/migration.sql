-- PRD 3 (Hidden Gems Engine) — Phase 6: DiscoveryRun observability.
-- One row per (pipeline, runBatchId) so orchestrator invocations are
-- inspectable (counts at every gate, duration, errors). Parallels the
-- ScraperRun model from PRD 2 Phase 6.

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "runBatchId" TEXT NOT NULL,
    "source" "DiscoverySource" NOT NULL,
    "status" "DiscoveryRunStatus" NOT NULL DEFAULT 'PENDING',
    "rawCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedAsEventCount" INTEGER NOT NULL DEFAULT 0,
    "droppedForQualityCount" INTEGER NOT NULL DEFAULT 0,
    "unverifiedCount" INTEGER NOT NULL DEFAULT 0,
    "upsertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedExistingCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryRun_runBatchId_idx" ON "DiscoveryRun"("runBatchId");

-- CreateIndex
CREATE INDEX "DiscoveryRun_source_createdAt_idx" ON "DiscoveryRun"("source", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_status_createdAt_idx" ON "DiscoveryRun"("status", "createdAt");
