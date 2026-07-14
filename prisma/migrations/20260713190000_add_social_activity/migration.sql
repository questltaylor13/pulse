-- Wave 5 — social activity pointer rows.
--
-- RANKED_ITEM activities point at a UserRankedEntry rather than snapshotting
-- its rank/title: the Beli mechanic reorders lists constantly, so the feed
-- hydrates current content at read time. ON DELETE CASCADE means a removed
-- entry takes its feed row with it, enforced by the database.
--
-- The unique index on rankedEntryId caps the duel loop at one feed row per
-- entry. Postgres permits multiple NULLs in a unique index, so rows of other
-- activity types (which leave rankedEntryId NULL) are unaffected.

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RANKED_ITEM';

-- AlterTable
ALTER TABLE "UserActivity" ADD COLUMN     "rankedEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserActivity_rankedEntryId_key" ON "UserActivity"("rankedEntryId");

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_rankedEntryId_fkey" FOREIGN KEY ("rankedEntryId") REFERENCES "UserRankedEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
