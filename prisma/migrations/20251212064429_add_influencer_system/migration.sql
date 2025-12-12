-- CreateEnum
CREATE TYPE "PickSetRange" AS ENUM ('WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "citySlug" TEXT NOT NULL DEFAULT 'denver',
    "vibeDescription" TEXT,
    "preferredCategories" "Category"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPickSet" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "range" "PickSetRange" NOT NULL,
    "title" TEXT NOT NULL,
    "summaryText" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPickSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPick" (
    "id" TEXT NOT NULL,
    "pickSetId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInfluencerFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInfluencerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_handle_key" ON "Influencer"("handle");

-- CreateIndex
CREATE INDEX "Influencer_citySlug_idx" ON "Influencer"("citySlug");

-- CreateIndex
CREATE INDEX "InfluencerPickSet_influencerId_range_idx" ON "InfluencerPickSet"("influencerId", "range");

-- CreateIndex
CREATE INDEX "InfluencerPickSet_expiresAt_idx" ON "InfluencerPickSet"("expiresAt");

-- CreateIndex
CREATE INDEX "InfluencerPick_pickSetId_rank_idx" ON "InfluencerPick"("pickSetId", "rank");

-- CreateIndex
CREATE INDEX "InfluencerPick_itemId_idx" ON "InfluencerPick"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerPick_pickSetId_itemId_key" ON "InfluencerPick"("pickSetId", "itemId");

-- CreateIndex
CREATE INDEX "UserInfluencerFollow_userId_idx" ON "UserInfluencerFollow"("userId");

-- CreateIndex
CREATE INDEX "UserInfluencerFollow_influencerId_idx" ON "UserInfluencerFollow"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInfluencerFollow_userId_influencerId_key" ON "UserInfluencerFollow"("userId", "influencerId");

-- AddForeignKey
ALTER TABLE "InfluencerPickSet" ADD CONSTRAINT "InfluencerPickSet_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPick" ADD CONSTRAINT "InfluencerPick_pickSetId_fkey" FOREIGN KEY ("pickSetId") REFERENCES "InfluencerPickSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPick" ADD CONSTRAINT "InfluencerPick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInfluencerFollow" ADD CONSTRAINT "UserInfluencerFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInfluencerFollow" ADD CONSTRAINT "UserInfluencerFollow_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
