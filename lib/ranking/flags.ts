/**
 * PRD 6 — Feature flag reads.
 *
 * RANKING_V2_ENABLED gates the transition from the legacy scorer to the
 * new lib/ranking/ path. While it's off, precompute still runs and
 * populates the cache, but fetchHomeFeed / /api/feed fall through to the
 * legacy sorts. Flip to "true" once dashboards are green.
 *
 * The flag lives in env because the goal is no-deploy toggling (flip it
 * in Vercel env + redeploy on next cron; actual runtime read is cheap).
 */

export function isRankingV2Enabled(): boolean {
  return process.env.RANKING_V2_ENABLED === "true";
}

export function isOutsideUsualEnabled(): boolean {
  return process.env.OUTSIDE_USUAL_ENABLED === "true";
}

/**
 * Gates the personalized "For You" landing feed. Reads the same
 * RankedFeedCache as RANKING_V2 but behind its own flag so the new surface
 * can be rolled out / rolled back independently. When on, "For You" also
 * becomes the default home tab.
 */
export function isForYouEnabled(): boolean {
  return process.env.FOR_YOU_ENABLED === "true";
}

/**
 * Wave 4 — gates the Rate & Rank engine surfaces: the sentiment/duel rating
 * flow, /rankings pages, and the rank-derived signals in buildRankingContext.
 * Off ⇒ the app behaves exactly as pre-Wave-4 (stars UI, no rank reads).
 */
export function isRateRankEnabled(): boolean {
  return process.env.RATE_RANK_ENABLED === "true";
}

/**
 * Wave 5 — gates trust & social surfacing: RANKED_ITEM activity emission, the
 * /feed/following page, the featured-lists rail, and the followed-loved signal
 * in buildRankingContext. Off ⇒ no activity rows are written and the social
 * sub-factor contributes an empty signal set, so scores are byte-identical to
 * pre-Wave-5.
 */
export function isSocialV1Enabled(): boolean {
  return process.env.SOCIAL_V1_ENABLED === "true";
}
