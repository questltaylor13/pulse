/**
 * Source priority for event deduplication.
 *
 * When the same event is ingested by multiple scrapers, the record from the
 * higher-priority source wins. Reorder this list to tune which source the
 * home feed prefers.
 *
 * Rationale (tune as needed):
 * - do303: richest editorial metadata (images, blurbs, categories)
 * - red-rocks / chautauqua / pikes-peak-center: venue-first, reliable times
 * - westword: good editorial, slower to update
 * - visit-*: marketing-first, loose times
 * - ticketmaster / eventbrite: API-sourced, leanest metadata
 */
export const SOURCE_PRIORITY: readonly string[] = [
  "do303",
  "red-rocks",
  "westword",
  "visit-denver",
  "visit-golden",
  "chautauqua",
  "pikes-peak-center",
  "visit-estes-park",
  "visit-steamboat-chamber",
  "ticketmaster",
  "eventbrite",
];

const PRIORITY_INDEX: Map<string, number> = new Map(
  SOURCE_PRIORITY.map((src, idx) => [src, idx]),
);

export function sourceRank(source: string): number {
  const idx = PRIORITY_INDEX.get(source);
  return idx === undefined ? SOURCE_PRIORITY.length : idx;
}

function richness<T extends { imageUrl?: string | null; priceRange?: string | null; description?: string | null }>(r: T): number {
  let score = 0;
  if (r.imageUrl) score += 1;
  if (r.priceRange) score += 1;
  if (r.description && r.description.length > 40) score += 1;
  return score;
}

/**
 * Returns the higher-priority record of the two. Ties break on metadata richness.
 */
export function prioritize<
  T extends {
    source: string;
    imageUrl?: string | null;
    priceRange?: string | null;
    description?: string | null;
  },
>(a: T, b: T): T {
  const rankA = sourceRank(a.source);
  const rankB = sourceRank(b.source);
  if (rankA !== rankB) return rankA < rankB ? a : b;
  return richness(a) >= richness(b) ? a : b;
}
