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
