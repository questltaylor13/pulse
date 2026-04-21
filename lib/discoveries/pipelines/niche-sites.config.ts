/**
 * Niche Sites config (PRD 3 Phase 3).
 *
 * Hand-curated list of small community sites that are too low-volume to
 * justify a full scraper but too high-signal to ignore. Each entry declares
 * a per-site `extract` function that parses the fetched HTML (via cheerio)
 * into Discovery candidates.
 *
 * Expected volume per site per run: 1–5 candidates. If a site consistently
 * returns 0 after the first couple runs, its selector probably drifted —
 * update `extract` or flip `enabled: false` until fixed.
 *
 * Before adding a new site:
 *   1. Verify the URL is live and robots.txt allows fetching
 *   2. Inspect the HTML and pick selectors for candidate blocks
 *   3. Keep `extract` under ~25 lines — complex pages belong in real scrapers
 */

import type { CheerioAPI } from "cheerio";
import type { Category, EventRegion } from "@prisma/client";
import type { DiscoveryCandidate } from "@/lib/discoveries/types";

export interface NicheSiteConfig {
  name: string; // Human-readable label (used in logs)
  url: string;
  subtype: DiscoveryCandidate["subtype"];
  category: Category;
  town: string;
  region: EventRegion;
  enabled: boolean;
  extract: (
    $: CheerioAPI,
    ctx: { site: NicheSiteConfig }
  ) => DiscoveryCandidate[];
}

// Helper used by most extractors — pick a candidate block, read a title from
// a heading selector, description from the block text, and bail if empty.
function extractBySelectors(params: {
  $: CheerioAPI;
  site: NicheSiteConfig;
  blockSelector: string;
  titleSelector: string;
  descriptionSelector?: string; // Defaults to block text
  linkSelector?: string; // For per-candidate permalink
  limit?: number;
}): DiscoveryCandidate[] {
  const { $, site, blockSelector, titleSelector, descriptionSelector, linkSelector } =
    params;
  const limit = params.limit ?? 8;
  const results: DiscoveryCandidate[] = [];

  $(blockSelector)
    .slice(0, limit)
    .each((_, el) => {
      const block = $(el);
      const title = block.find(titleSelector).first().text().trim().replace(/\s+/g, " ");
      if (!title) return;
      const descriptionRaw = descriptionSelector
        ? block.find(descriptionSelector).first().text()
        : block.text();
      const description = descriptionRaw.trim().replace(/\s+/g, " ").slice(0, 600);
      if (!description) return;
      const href = linkSelector
        ? block.find(linkSelector).first().attr("href")
        : block.find("a").first().attr("href");
      const sourceUrl = absolutize(href, site.url);
      results.push({
        title: title.slice(0, 150),
        description,
        subtype: site.subtype,
        category_hint: site.category,
        location_hint: null,
        town_hint: site.town,
        season_hint: null,
        source_urls: [sourceUrl ?? site.url],
      });
    });

  return results;
}

function absolutize(href: string | undefined, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export const NICHE_SITES: NicheSiteConfig[] = [
  {
    name: "Denver Curling Club — events",
    url: "https://denvercurlingclub.com/events",
    subtype: "NICHE_ACTIVITY",
    category: "FITNESS",
    town: "Denver",
    region: "DENVER_METRO",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: "article, .event, .event-card, .events-list li",
        titleSelector: "h1, h2, h3, .event-title, .title",
      }),
  },
  {
    name: "Denver Archery Center — programs",
    url: "https://www.denverarcherycenter.com/",
    subtype: "NICHE_ACTIVITY",
    category: "FITNESS",
    town: "Denver",
    region: "DENVER_METRO",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: "section, article, .program, .class",
        titleSelector: "h1, h2, h3, .program-title",
      }),
  },
  {
    name: "Denver Bike Party",
    url: "https://denverbikeparty.com/",
    subtype: "NICHE_ACTIVITY",
    category: "SOCIAL",
    town: "Denver",
    region: "DENVER_METRO",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: "article, .ride, .event, .post",
        titleSelector: "h1, h2, h3",
      }),
  },
  {
    name: "Colorado Mountain Club — trips",
    url: "https://www.cmc.org/",
    subtype: "NICHE_ACTIVITY",
    category: "OUTDOORS",
    town: "Denver",
    region: "DENVER_METRO",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: ".event, .trip, article, .calendar-item",
        titleSelector: "h1, h2, h3, .event-title, .trip-title",
        limit: 10,
      }),
  },
  {
    name: "Boulder Rock Club — programs",
    url: "https://www.boulderrockclub.com/programs",
    subtype: "NICHE_ACTIVITY",
    category: "FITNESS",
    town: "Boulder",
    region: "FRONT_RANGE",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: "article, section, .program, .class",
        titleSelector: "h1, h2, h3",
      }),
  },
  {
    name: "Fort Collins Bike Co-op — events",
    url: "https://fcbikecoop.org/events",
    subtype: "NICHE_ACTIVITY",
    category: "SOCIAL",
    town: "Fort Collins",
    region: "FRONT_RANGE",
    enabled: true,
    extract: ($, { site }) =>
      extractBySelectors({
        $,
        site,
        blockSelector: "article, .event, .tribe-events-calendar-list__event",
        titleSelector: "h1, h2, h3, .event-title",
      }),
  },
];
