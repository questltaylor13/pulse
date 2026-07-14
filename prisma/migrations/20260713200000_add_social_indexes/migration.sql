-- Wave 5 — indexes for the social read paths.
--
-- Separate from add_social_activity because a committed migration is immutable:
-- if that one has already been applied anywhere, editing it would silently never
-- re-run. These came out of the 8-angle review, which found that `take` was
-- bounding the rows RETURNED by the social queries but not the rows READ.
--
-- 1. The two-hop load (who you follow → what they LIKED) filters on
--    sentiment + isPlacementConfirmed and sorts by score. None of the three were
--    indexed: userId alone was servable (it leads the @@unique composites), but
--    sentiment/isPlacementConfirmed became heap filters and the score sort was a
--    full materialize-then-top-N. At 100 follows × 200 entries that is ~20k heap
--    rows fetched and sorted, on the READ path, per re-rank.
--
-- 2. The follow-suggestions query asks "has this user published any rankings?",
--    which compiles to a semi-join on isPlacementConfirmed with no userId — a
--    full table scan of UserRankedEntry on every /feed/following render.
--
-- 3. The featured-lists rail orders public lists by saveCount. @@index([isPublic])
--    is a low-cardinality boolean the planner will ignore in favour of a seq scan
--    plus a sort.

-- CreateIndex
CREATE INDEX "UserRankedEntry_userId_sentiment_isPlacementConfirmed_score_idx" ON "UserRankedEntry"("userId", "sentiment", "isPlacementConfirmed", "score");

-- CreateIndex
CREATE INDEX "UserRankedEntry_isPlacementConfirmed_idx" ON "UserRankedEntry"("isPlacementConfirmed");

-- CreateIndex
CREATE INDEX "List_isPublic_saveCount_idx" ON "List"("isPublic", "saveCount");
