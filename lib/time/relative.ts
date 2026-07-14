/**
 * Relative time formatting ("3m ago", "2d ago").
 *
 * Extracted in Wave 5 as the third copy: app/(site)/admin/ranking/page.tsx and
 * admin/scrapers/ScraperStatusBoard.tsx had each hand-rolled it, and the
 * following feed was about to make a fourth.
 */

/** Falls back to an absolute short date past a week — "63d ago" tells nobody anything. */
export function formatAgo(input: string | Date, now: Date = new Date()): string {
  const then = new Date(input).getTime();
  if (!Number.isFinite(then)) return "";

  // Floor, not round: "5m ago" should mean at least five minutes have passed.
  // Rounding turns 30 seconds into "1m ago" and, worse, 45 seconds into a
  // minute that hasn't happened yet.
  const mins = Math.max(0, Math.floor((now.getTime() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
