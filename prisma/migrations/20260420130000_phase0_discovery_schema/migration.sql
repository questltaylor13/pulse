-- PRD 3 (Hidden Gems Engine) — Phase 0: Discovery schema.
-- Introduces the Discovery content type — curated local content that doesn't
-- fit Event or Place taxonomy (hidden spots, niche activities, seasonal tips).
-- Reuses the existing EventRegion and Category enums for cross-content-type
-- consistency. Observability tables (LLMResearchRun, DiscoveryRun) land in
-- later phases per PRD scope.

-- CreateEnum
CREATE TYPE "DiscoverySubtype" AS ENUM ('HIDDEN_GEM', 'NICHE_ACTIVITY', 'SEASONAL_TIP');

-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('REDDIT', 'LLM_RESEARCH', 'NICHE_SITE', 'EDITORIAL', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'UNVERIFIED', 'FLAGGED');

-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtype" "DiscoverySubtype" NOT NULL,
    "category" "Category" NOT NULL,
    "neighborhood" TEXT,
    "townName" TEXT,
    "region" "EventRegion" NOT NULL DEFAULT 'DENVER_METRO',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "seasonHint" TEXT,
    "sourceType" "DiscoverySource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceUpvotes" INTEGER,
    "mentionedByN" INTEGER NOT NULL DEFAULT 1,
    "qualityScore" INTEGER NOT NULL,
    "tags" TEXT[],
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'ACTIVE',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discovery_status_qualityScore_idx" ON "Discovery"("status", "qualityScore");

-- CreateIndex
CREATE INDEX "Discovery_category_status_idx" ON "Discovery"("category", "status");

-- CreateIndex
CREATE INDEX "Discovery_region_status_idx" ON "Discovery"("region", "status");
