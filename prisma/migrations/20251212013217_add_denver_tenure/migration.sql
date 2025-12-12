/*
  Warnings:

  - Made the column `citySlug` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "citySlug" SET NOT NULL,
ALTER COLUMN "citySlug" SET DEFAULT 'denver';
