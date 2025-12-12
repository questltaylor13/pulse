-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "appleRating" DOUBLE PRECISION,
ADD COLUMN     "appleRatingCount" INTEGER,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleRatingCount" INTEGER,
ADD COLUMN     "neighborhood" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "appleRating" DOUBLE PRECISION,
ADD COLUMN     "appleRatingCount" INTEGER,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleRatingCount" INTEGER;
