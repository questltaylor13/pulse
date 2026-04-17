-- AlterTable: Add AI enrichment fields to Event
ALTER TABLE "Event" ADD COLUMN "oneLiner" TEXT;
ALTER TABLE "Event" ADD COLUMN "noveltyScore" INTEGER;
ALTER TABLE "Event" ADD COLUMN "qualityScore" INTEGER;

-- AlterTable: Add AI enrichment fields to Item
ALTER TABLE "Item" ADD COLUMN "oneLiner" TEXT;
ALTER TABLE "Item" ADD COLUMN "noveltyScore" INTEGER;
ALTER TABLE "Item" ADD COLUMN "qualityScore" INTEGER;
