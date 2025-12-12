-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('WANT', 'DONE', 'PASS');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EVENT', 'PLACE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Category" ADD VALUE 'RESTAURANT';
ALTER TYPE "Category" ADD VALUE 'ACTIVITY_VENUE';

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "cityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "tags" TEXT[],
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "googleMapsUrl" TEXT,
    "appleMapsUrl" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "priceRange" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "externalId" TEXT,
    "imageUrl" TEXT,
    "neighborhood" TEXT,
    "hours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItemStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItemRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserItemRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSuggestionSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "weeklyIds" TEXT[],
    "monthlyIds" TEXT[],
    "reasonsJson" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSuggestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_cityId_type_idx" ON "Item"("cityId", "type");

-- CreateIndex
CREATE INDEX "Item_type_startTime_idx" ON "Item"("type", "startTime");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Item_externalId_source_key" ON "Item"("externalId", "source");

-- CreateIndex
CREATE INDEX "UserItemStatus_userId_status_idx" ON "UserItemStatus"("userId", "status");

-- CreateIndex
CREATE INDEX "UserItemStatus_itemId_idx" ON "UserItemStatus"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemStatus_userId_itemId_key" ON "UserItemStatus"("userId", "itemId");

-- CreateIndex
CREATE INDEX "UserItemRating_userId_idx" ON "UserItemRating"("userId");

-- CreateIndex
CREATE INDEX "UserItemRating_itemId_idx" ON "UserItemRating"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemRating_userId_itemId_key" ON "UserItemRating"("userId", "itemId");

-- CreateIndex
CREATE INDEX "ItemView_userId_createdAt_idx" ON "ItemView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ItemView_itemId_idx" ON "ItemView"("itemId");

-- CreateIndex
CREATE INDEX "UserSuggestionSet_userId_expiresAt_idx" ON "UserSuggestionSet"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemStatus" ADD CONSTRAINT "UserItemStatus_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemRating" ADD CONSTRAINT "UserItemRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemRating" ADD CONSTRAINT "UserItemRating_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSuggestionSet" ADD CONSTRAINT "UserSuggestionSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
