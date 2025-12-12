-- Make citySlug optional for users
ALTER TABLE "User" ALTER COLUMN "citySlug" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "citySlug" DROP DEFAULT;
