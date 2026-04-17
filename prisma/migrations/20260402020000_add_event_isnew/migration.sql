-- AlterTable: Add isNew to Event
ALTER TABLE "Event" ADD COLUMN "isNew" BOOLEAN NOT NULL DEFAULT false;
