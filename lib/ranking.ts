/**
 * Editorial ranking for home-feed sections (specifically "This weekend's picks").
 * Distinct from lib/scoring.ts, which powers personalized recommendations.
 *
 * Formula: editorsPick * 0.4 + recency * 0.2 + popularity * 0.3 + personalFit * 0.1
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RankableItem {
  id: string;
  isEditorsPick?: boolean | null;
  createdAt: Date;
  startTime?: Date | null;
  viewCount?: number | null;
  saveCount?: number | null;
  noveltyScore?: number | null;
}

export interface RankContext {
  now: Date;
  userPrefs?: UserPrefsLike;
}

export interface UserPrefsLike {
  preferredCategories?: string[];
  preferredVibes?: string[];
}

// Exponential decay keyed to a half-life in days.
function decayExp(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

// Log-normalize an unbounded popularity signal to [0, 1].
// log1p saturates gracefully; divide by a sensible ceiling for normalization.
function normalizeLog(raw: number): number {
  const v = Math.log1p(Math.max(0, raw));
  const ceiling = Math.log1p(1000); // 1000 view-equivalents ~ top of scale
  return Math.min(1, v / ceiling);
}

function ageDays(item: RankableItem, now: Date): number {
  return Math.max(0, (now.getTime() - item.createdAt.getTime()) / DAY_MS);
}

function personalFitScore(_item: RankableItem, _prefs: UserPrefsLike): number {
  // Phase 1: no personalization on anon home. Return 0.5 neutral.
  // A later phase can wire this to user profile categories/vibes.
  return 0.5;
}

export function editorialRank<T extends RankableItem>(item: T, ctx: RankContext): number {
  const editors = item.isEditorsPick ? 1 : 0;
  const recency = decayExp(ageDays(item, ctx.now), 14);
  const popularity = normalizeLog((item.viewCount ?? 0) + 3 * (item.saveCount ?? 0));
  const personalFit = ctx.userPrefs ? personalFitScore(item, ctx.userPrefs) : 0.5;
  return editors * 0.4 + recency * 0.2 + popularity * 0.3 + personalFit * 0.1;
}

export function sortByEditorialRank<T extends RankableItem>(items: T[], ctx: RankContext): T[] {
  const now = ctx.now;
  return [...items].sort(
    (a, b) => editorialRank(b, { now, userPrefs: ctx.userPrefs }) - editorialRank(a, { now, userPrefs: ctx.userPrefs })
  );
}

// Exported for unit tests.
export const __internals = { decayExp, normalizeLog, ageDays, personalFitScore };
