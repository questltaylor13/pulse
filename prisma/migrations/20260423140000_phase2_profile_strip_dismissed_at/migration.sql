-- PRD 5 Phase 2 §2.1 — record when a user dismissed the profile-completion
-- strip so the feed can re-show it 48h later. Null on every existing row.

ALTER TABLE "User" ADD COLUMN "profileStripDismissedAt" TIMESTAMP(3);
