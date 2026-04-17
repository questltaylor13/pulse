import { Category } from "@prisma/client";

// ---------------------------------------------------------------------------
// Venue-based classification (strongest signal — checked first)
// ---------------------------------------------------------------------------

const VENUE_MAP: [RegExp, Category][] = [
  // Denver live music venues
  [/\b(gothic|ogden|bluebird|cervantes)\b/i, "LIVE_MUSIC"],
  [/\bfox\s+theat(re|er)\b/i, "LIVE_MUSIC"],
  [/\bmission\s+ballroom\b/i, "LIVE_MUSIC"],
  [/\bred\s+rocks\b/i, "LIVE_MUSIC"],
  [/\bball\s*arena\b/i, "LIVE_MUSIC"],
  [/\bfillmore\s+auditorium\b/i, "LIVE_MUSIC"],
  [/\bsummit\s+(music\s+hall|denver)\b/i, "LIVE_MUSIC"],
  [/\blost\s+lake\b/i, "LIVE_MUSIC"],
  [/\bhi-?dive\b/i, "LIVE_MUSIC"],
  [/\blarimer\s+lounge\b/i, "LIVE_MUSIC"],
  [/\bglobe\s+hall\b/i, "LIVE_MUSIC"],
  [/\bmarquis\b/i, "LIVE_MUSIC"],
  [/\bsoiled\s+dove\b/i, "LIVE_MUSIC"],
  [/\bparamount\s+theat(re|er)\b/i, "LIVE_MUSIC"],
  [/\bdazzle\b/i, "LIVE_MUSIC"],
  [/\b1stbank\s+center\b/i, "LIVE_MUSIC"],
  [/\bfiddler'?s\s+green\b/i, "LIVE_MUSIC"],
  [/\bbellco\s+theat(re|er)\b/i, "LIVE_MUSIC"],
  [/\bchurch\s+nightclub\b/i, "LIVE_MUSIC"],
  [/\bclub\s+vinyl\b/i, "LIVE_MUSIC"],
  [/\bblack\s+box\b/i, "LIVE_MUSIC"],
  [/\bnocturne\b/i, "LIVE_MUSIC"],
  [/\betown\s+hall\b/i, "LIVE_MUSIC"],
  [/\bmoxi\s+theater\b/i, "LIVE_MUSIC"],
  [/\bboulder\s+theater\b/i, "LIVE_MUSIC"],
  [/\bophelia'?s\b/i, "LIVE_MUSIC"],
  [/\btwo\s+moons\b/i, "LIVE_MUSIC"],
  [/\bswallow\s+hill\b/i, "LIVE_MUSIC"],
  [/\bnissi'?s\b/i, "LIVE_MUSIC"],
  [/\boriental\s+theater\b/i, "LIVE_MUSIC"],
  [/\bvelvet\s+elk\b/i, "LIVE_MUSIC"],
  [/\btrinidad\s+lounge\b/i, "LIVE_MUSIC"],
  [/\b3\s*kings\b/i, "LIVE_MUSIC"],
  [/\bgrizzly\s+rose\b/i, "LIVE_MUSIC"],
  [/\blevitt\s+pavilion\b/i, "LIVE_MUSIC"],
  [/\bboettcher\s+concert\b/i, "LIVE_MUSIC"],
  [/\bmercury\s+cafe\b/i, "LIVE_MUSIC"],
  [/\bpepsi\s+center\b/i, "LIVE_MUSIC"],
  [/\bla\s+rumba\b/i, "LIVE_MUSIC"],

  // Performing arts / theater venues
  [/\bbuell\s+theat(re|er)\b/i, "ART"],
  [/\btemple\s+hoyne\b/i, "ART"],
  [/\bdcpa\b/i, "ART"],
  [/\bellie\s+caulkins\b/i, "ART"],
  [/\bdenver\s+(center|centre).*performing/i, "ART"],
  [/\bdenver\s+art\s+museum\b/i, "ART"],
  [/\bmuseum\s+of\s+contemporary\b/i, "ART"],
  [/\bmeow\s+wolf\b/i, "ART"],
  [/\bsu\s+teatro\b/i, "ART"],
  [/\bspace\s+gallery\b/i, "ART"],
  [/\bdangerous\s+theat(re|er)\b/i, "ART"],
  [/\bfederal\s+theat(re|er)\b/i, "ART"],
  [/\bbovine\s+metropolis\b/i, "ART"],
  [/\bcomedy\s+works\b/i, "COMEDY"],
  [/\brise\s+comedy\b/i, "COMEDY"],
  [/\bpunch\s*line\b/i, "COMEDY"],
  [/\bsie\s+film/i, "ART"],
  [/\bdickens\s+opera\b/i, "ART"],
  [/\bpikes\s+peak\s+center\b/i, "ART"],

  // Activity venues
  [/\bescape\s*(works|room)/i, "ACTIVITY_VENUE"],
  [/\bbad\s+axe\b/i, "ACTIVITY_VENUE"],
  [/\ball\s+out\s+smash\b/i, "ACTIVITY_VENUE"],
  [/\bifly\b/i, "ACTIVITY_VENUE"],
  [/\bhouse\s+of\s+immersions?\b/i, "ACTIVITY_VENUE"],
  [/\barchery\s+games\b/i, "ACTIVITY_VENUE"],
  [/\bbear\s+creek\s+archery\b/i, "ACTIVITY_VENUE"],
  [/\bcurling\s+club\b/i, "ACTIVITY_VENUE"],
  [/\brock\s+creek\s+curling\b/i, "ACTIVITY_VENUE"],

  // Climbing / fitness venues
  [/\bdenver\s+bouldering\b/i, "FITNESS"],
  [/\bmovement\s+rino\b/i, "FITNESS"],
  [/\bthe\s+spot\s+denver\b/i, "FITNESS"],
  [/\bmile\s+hi\s+pickleball\b/i, "FITNESS"],
  [/\bpickleball\s+food\s+pub\b/i, "FITNESS"],

  // Generic venue-type patterns (bars/drinking)
  [/\bbrewery\b/i, "BARS"],
  [/\btaproom\b/i, "BARS"],
  [/\bbrewing\b/i, "BARS"],
  [/\bbeerworks\b/i, "BARS"],
  [/\bwinery\b/i, "BARS"],
  [/\bdistillery\b/i, "BARS"],
  [/\bwatering\s+bowl\b/i, "BARS"],
  [/\bspeakeasy\b/i, "BARS"],
  [/\bcocktail\b/i, "BARS"],
  [/\btavern\b/i, "BARS"],
  [/\bsaloon\b/i, "BARS"],
  [/\bwine\s+bar\b/i, "BARS"],
  [/\bbeer\s+garden\b/i, "BARS"],
  [/\bpub\b/i, "BARS"],
  [/\bnightclub\b/i, "BARS"],
  [/\blounge\b/i, "BARS"],  // Generic lounge; specific music lounges matched above
];

// ---------------------------------------------------------------------------
// Keyword-based classification (fallback — uses word-boundary matching)
// ---------------------------------------------------------------------------

type KeywordMap = { keywords: string[]; weight: number };

const CATEGORY_KEYWORDS: Record<string, KeywordMap[]> = {
  LIVE_MUSIC: [
    { keywords: ["concert", "live music", "band", "singer", "dj set", "album release"], weight: 3 },
    { keywords: ["music", "dj", "rapper", "hip hop", "jazz", "funk", "soul", "electronic", "bluegrass", "country", "reggae", "latin", "salsa"], weight: 2 },
    { keywords: ["gig", "open mic", "quintet", "quartet", "trio"], weight: 1 },
  ],
  ART: [
    { keywords: ["art walk", "gallery opening", "art exhibit", "museum", "sculpture", "broadway", "musical", "ballet", "opera", "symphony", "orchestra", "improv", "comedy show", "stand-up", "standup"], weight: 3 },
    { keywords: ["art", "gallery", "exhibition", "painting", "photography", "mural", "art show", "performing arts", "dance performance", "comedy", "playwright", "drama"], weight: 2 },
    { keywords: ["creative", "artist", "craft", "stage"], weight: 1 },
  ],
  FOOD: [
    { keywords: ["food festival", "food tasting", "dinner party", "brunch", "supper club", "food truck"], weight: 3 },
    { keywords: ["food", "restaurant", "dining", "chef", "culinary", "cooking class", "ramen", "sushi", "taco"], weight: 2 },
    { keywords: ["menu", "kitchen"], weight: 1 },
  ],
  BARS: [
    { keywords: ["happy hour", "bar crawl", "cocktail", "brewery tour", "beer festival", "whiskey tasting", "mezcal tasting", "tequila tasting", "beer tasting"], weight: 3 },
    { keywords: ["bar", "brewery", "taproom", "pub", "drinks", "nightlife", "club night", "wine tasting"], weight: 2 },
    { keywords: ["drink", "beer", "wine", "spirits", "tasting"], weight: 1 },
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
  COMEDY: [
    { keywords: ["comedy show", "stand-up", "standup", "improv show", "improv comedy", "sketch comedy"], weight: 3 },
    { keywords: ["comedy", "improv", "comedian", "comic", "laugh", "open mic comedy"], weight: 2 },
    { keywords: ["funny", "humor", "joke"], weight: 1 },
  ],
  SOCIAL: [
    { keywords: ["run club", "running club", "social run", "sports league", "adult league"], weight: 3 },
    { keywords: ["social", "meetup", "community", "league", "club", "group ride", "cycling club"], weight: 2 },
    { keywords: ["networking", "mixer", "hangout", "gathering"], weight: 1 },
  ],
  WELLNESS: [
    { keywords: ["spa day", "wellness retreat", "meditation class", "sound bath", "float therapy"], weight: 3 },
    { keywords: ["wellness", "self-care", "recovery", "mindfulness", "breathwork", "sauna"], weight: 2 },
    { keywords: ["relax", "restore", "rejuvenate"], weight: 1 },
  ],
  ACTIVITY_VENUE: [
    { keywords: ["escape room", "axe throwing", "archery", "curling", "rage room", "splatter paint", "indoor skydiving"], weight: 3 },
    { keywords: ["bowling", "trampoline", "go kart", "laser tag", "mini golf", "virtual reality"], weight: 2 },
    { keywords: ["adventure", "experience", "challenge"], weight: 1 },
  ],
};

/** Word-boundary match to prevent substring false positives (e.g. "eat" in "theatre") */
function matchesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export function classifyEvent(title: string, venueName: string): Category {
  // 1. Venue-based classification (strongest signal)
  for (const [pattern, category] of VENUE_MAP) {
    if (pattern.test(venueName)) {
      return category;
    }
  }

  // 2. Keyword matching with word boundaries
  const text = `${title} ${venueName}`;
  let best: { category: string; score: number } = { category: "OTHER", score: 0 };

  for (const [category, groups] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const group of groups) {
      for (const keyword of group.keywords) {
        if (matchesKeyword(text, keyword)) {
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
  // Scoring-compatible tags (match lib/scoring.ts tag sets)
  [/\bconcert|live\s+music\b/i, "concert"],
  [/\bcomedy|stand[- ]up|improv\b/i, "comedy"],
  [/\btrivia|quiz\s*night/i, "trivia"],
  [/\byoga\b/i, "yoga"],
  [/\bmeditat/i, "meditation"],
  [/\bworkshop|master\s*class/i, "workshop"],
  [/\bfestival\b/i, "festival"],
  [/\bparty|parties\b/i, "party"],
  [/\bdanc(e|ing)\b/i, "dancing"],
  [/\bnetwork(ing)?\b/i, "networking"],
  [/\bsocial\b/i, "social"],
  [/\bfitness|workout|bootcamp|crossfit/i, "fitness"],
  [/\bdog[- ]friendly|pup[- ]friendly|bring\s+your\s+(dog|pup)/i, "dog-friendly"],
  [/\bclass\b/i, "class"],
  [/\bmeetup|meet[- ]up/i, "meetup"],
  [/\bgame\s*night/i, "game-night"],
  [/\bsolo/i, "solo-friendly"],
  [/\bromantic|date\s*night/i, "romantic"],
];

export function extractTags(title: string, venueName: string): string[] {
  const text = `${title} ${venueName}`;
  const tags: string[] = [];

  for (const [pattern, tag] of TAG_PATTERNS) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }

  return tags;
}
