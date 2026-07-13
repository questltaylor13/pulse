-- CreateEnum
CREATE TYPE "RankCategory" AS ENUM ('RESTAURANTS', 'BARS', 'COFFEE', 'ACTIVE', 'ARTS', 'EXPERIENCES');

-- CreateEnum
CREATE TYPE "RankSentiment" AS ENUM ('LIKED', 'FINE', 'DISLIKED');

-- CreateEnum
CREATE TYPE "ComparisonOutcome" AS ENUM ('WON', 'LOST', 'SKIPPED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rankingsArePublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserItemStatus" ADD COLUMN     "promptDismissedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserRankedEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "placeId" TEXT,
    "discoveryId" TEXT,
    "category" "RankCategory" NOT NULL,
    "sentiment" "RankSentiment" NOT NULL,
    "position" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "isPlacementConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "titleSnapshot" TEXT,
    "imageSnapshot" TEXT,
    "categorySnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRankedEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "RankCategory" NOT NULL,
    "subjectEntryId" TEXT,
    "opponentEntryId" TEXT,
    "outcome" "ComparisonOutcome" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRankedEntry_userId_category_position_idx" ON "UserRankedEntry"("userId", "category", "position");

-- CreateIndex
CREATE INDEX "UserRankedEntry_eventId_idx" ON "UserRankedEntry"("eventId");

-- CreateIndex
CREATE INDEX "UserRankedEntry_placeId_idx" ON "UserRankedEntry"("placeId");

-- CreateIndex
CREATE INDEX "UserRankedEntry_discoveryId_idx" ON "UserRankedEntry"("discoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRankedEntry_userId_eventId_key" ON "UserRankedEntry"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRankedEntry_userId_placeId_key" ON "UserRankedEntry"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRankedEntry_userId_discoveryId_key" ON "UserRankedEntry"("userId", "discoveryId");

-- CreateIndex
CREATE INDEX "RankComparison_userId_category_createdAt_idx" ON "RankComparison"("userId", "category", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "Discovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankComparison" ADD CONSTRAINT "RankComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-added: at most one content ref per entry. Creates require exactly one
-- (enforced in lib/rank-engine/service.ts); onDelete: SetNull may later null
-- the ref, leaving the snapshot-only row — hence <= 1, not = 1.
ALTER TABLE "UserRankedEntry" ADD CONSTRAINT "UserRankedEntry_single_ref_check" CHECK (
  ((("eventId" IS NOT NULL))::int + (("placeId" IS NOT NULL))::int + (("discoveryId" IS NOT NULL))::int) <= 1
);
