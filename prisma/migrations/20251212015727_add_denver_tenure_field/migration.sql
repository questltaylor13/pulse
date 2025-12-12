-- CreateEnum
CREATE TYPE "DenverTenure" AS ENUM ('NEW_TO_DENVER', 'ONE_TO_TWO_YEARS', 'TWO_TO_FIVE_YEARS', 'FIVE_PLUS_YEARS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "denverTenure" "DenverTenure";
