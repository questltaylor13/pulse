import { Category } from "@prisma/client";

type KeywordMap = { keywords: string[]; weight: number };

const CATEGORY_KEYWORDS: Record<string, KeywordMap[]> = {
  LIVE_MUSIC: [
    { keywords: ["concert", "live music", "band", "singer", "dj set", "tour", "album release"], weight: 3 },
    { keywords: ["music", "dj", "rapper", "hip hop", "jazz", "rock", "funk", "soul", "electronic"], weight: 2 },
    { keywords: ["show", "gig", "set", "performance"], weight: 1 },
  ],
  ART: [
    { keywords: ["art walk", "gallery opening", "art exhibit", "museum", "sculpture"], weight: 3 },
    { keywords: ["art", "gallery", "exhibition", "painting", "photography", "mural", "art show"], weight: 2 },
    { keywords: ["creative", "artist", "craft"], weight: 1 },
  ],
  FOOD: [
    { keywords: ["food festival", "tasting", "dinner party", "brunch", "supper club", "food truck"], weight: 3 },
    { keywords: ["food", "restaurant", "dining", "chef", "culinary", "cooking class", "wine tasting"], weight: 2 },
    { keywords: ["eat", "taste", "menu", "kitchen"], weight: 1 },
  ],
  BARS: [
    { keywords: ["happy hour", "bar crawl", "cocktail", "brewery tour", "beer festival"], weight: 3 },
    { keywords: ["bar", "brewery", "taproom", "pub", "drinks", "nightlife", "club night"], weight: 2 },
    { keywords: ["drink", "beer", "wine", "spirits"], weight: 1 },
  ],
  COFFEE: [
    { keywords: ["coffee tasting", "latte art", "coffee class"], weight: 3 },
    { keywords: ["coffee", "cafe", "espresso", "roaster"], weight: 2 },
  ],
  OUTDOORS: [
    { keywords: ["hike", "trail run", "camping", "kayak", "bike ride", "outdoor adventure"], weight: 3 },
    { keywords: ["outdoor", "park", "nature", "mountain", "river", "garden", "farmers market"], weight: 2 },
    { keywords: ["outside", "fresh air", "trail"], weight: 1 },
  ],
  FITNESS: [
    { keywords: ["yoga", "crossfit", "run club", "5k", "marathon", "spin class", "bootcamp"], weight: 3 },
    { keywords: ["fitness", "workout", "gym", "exercise", "training", "wellness", "pilates"], weight: 2 },
    { keywords: ["health", "active", "sweat"], weight: 1 },
  ],
  SEASONAL: [
    { keywords: ["holiday", "christmas", "halloween", "new year", "fourth of july", "valentines"], weight: 3 },
    { keywords: ["seasonal", "winter", "summer", "spring", "fall", "pumpkin", "fireworks"], weight: 2 },
    { keywords: ["festive", "celebration"], weight: 1 },
  ],
  POPUP: [
    { keywords: ["pop-up", "popup", "pop up shop", "trunk show", "flash sale"], weight: 3 },
    { keywords: ["limited time", "one night only", "exclusive event"], weight: 2 },
  ],
};

export function classifyEvent(title: string, description: string): Category {
  const text = `${title} ${description}`.toLowerCase();
  let best: { category: string; score: number } = { category: "OTHER", score: 0 };

  for (const [category, groups] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const group of groups) {
      for (const keyword of group.keywords) {
        if (text.includes(keyword)) {
          score += group.weight;
        }
      }
    }
    if (score > best.score) {
      best = { category, score };
    }
  }

  return best.category as Category;
}

const TAG_PATTERNS: [RegExp, string][] = [
  [/\bfree\b/i, "free"],
  [/\b21\+|twenty-one\+|ages?\s*21/i, "21+"],
  [/\ball\s*ages|family[- ]friendly|kid[- ]friendly/i, "family-friendly"],
  [/\boutdoor|outside|patio|rooftop/i, "outdoor"],
  [/\bvirtual|online|zoom|livestream/i, "virtual"],
  [/\bbrunch/i, "brunch"],
  [/\bhappy\s*hour/i, "happy-hour"],
  [/\blate[- ]night/i, "late-night"],
  [/\bweekend/i, "weekend"],
];

export function extractTags(title: string, description: string): string[] {
  const text = `${title} ${description}`;
  const tags: string[] = [];

  for (const [pattern, tag] of TAG_PATTERNS) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return tags;
}
