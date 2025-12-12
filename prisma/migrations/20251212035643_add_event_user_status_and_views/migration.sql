-- CreateEnum
CREATE TYPE "EventListStatus" AS ENUM ('WANT', 'DONE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "appleMapsUrl" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "EventUserStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EventListStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventUserStatus_userId_status_idx" ON "EventUserStatus"("userId", "status");

-- CreateIndex
CREATE INDEX "EventUserStatus_eventId_idx" ON "EventUserStatus"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventUserStatus_userId_eventId_key" ON "EventUserStatus"("userId", "eventId");

-- CreateIndex
CREATE INDEX "EventView_userId_createdAt_idx" ON "EventView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EventView_eventId_idx" ON "EventView"("eventId");

-- AddForeignKey
ALTER TABLE "EventUserStatus" ADD CONSTRAINT "EventUserStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventUserStatus" ADD CONSTRAINT "EventUserStatus_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
