-- PRD 3 (Hidden Gems Engine) — Phase 1: LLMResearchRun debug log.
-- One row per (runBatchId, queryIndex) so raw prompts/responses/candidates
-- from the weekly LLM research pipeline stay inspectable and tunable without
-- re-running the pipeline. Downstream enrichment (Phase 4) reads the
-- candidates JSON column to produce Discovery records.

-- CreateEnum
CREATE TYPE "LLMResearchRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARSE_ERROR', 'API_ERROR');

-- CreateTable
CREATE TABLE "LLMResearchRun" (
    "id" TEXT NOT NULL,
    "runBatchId" TEXT NOT NULL,
    "queryIndex" INTEGER NOT NULL,
    "queryLabel" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "rawResponse" TEXT,
    "candidates" JSONB,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "webSearches" INTEGER NOT NULL DEFAULT 0,
    "status" "LLMResearchRunStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LLMResearchRun_runBatchId_idx" ON "LLMResearchRun"("runBatchId");

-- CreateIndex
CREATE INDEX "LLMResearchRun_status_createdAt_idx" ON "LLMResearchRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LLMResearchRun_queryLabel_createdAt_idx" ON "LLMResearchRun"("queryLabel", "createdAt");
