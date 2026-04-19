/**
 * Shared OpenAI enrichment function for events.
 *
 * Tags are chosen to match the exact vocabulary used by the scoring system
 * in lib/scoring.ts so that vibe, companion, social, and dog-friendly scores
 * produce non-zero values on enriched events.
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Tag vocabularies — kept in sync with lib/scoring.ts tag sets
// ---------------------------------------------------------------------------

const VIBE_TAGS = [
  "chill", "relaxed", "low-key", "casual", "acoustic", "coffee", "brunch",
  "yoga", "meditation", "spa", "self-care",
  "moderate", "fun", "social", "dinner", "live-music", "comedy", "trivia",
  "workshop", "outdoor",
  "high-energy", "party", "club", "dancing", "festival", "concert", "rave",
  "sports", "fitness", "adventure", "edm", "electronic",
];

const COMPANION_TAGS = [
  "solo-friendly", "self-care", "self-paced", "meditation", "yoga", "workshop",
  "class", "reading", "coffee", "museum", "gallery", "exhibition",
  "group", "friends-group", "social", "party", "trivia", "game-night", "brunch",
  "happy-hour", "bar-crawl", "festival", "concert",
  "family-friendly", "kid-friendly", "all-ages", "children", "family", "outdoor",
  "park", "zoo", "aquarium",
  "romantic", "date-night", "date-friendly", "intimate", "upscale", "dinner",
  "sunset",
];

const SOCIAL_TAGS = [
  "meetup", "networking", "social", "singles", "community", "class", "workshop",
  "group-activity", "tour", "walking-tour",
  "solo-friendly", "self-paced", "exhibition", "museum", "gallery", "coffee",
  "reading", "self-care",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventEnrichment {
  description: string;
  oneLiner: string | null;
  category: string | null;
  qualityScore: number | null;
  noveltyScore: number | null;
  // PRD 2 Phase 4: 1–10 score for regional events only. Null for DENVER_METRO.
  worthTheDriveScore: number | null;
  tags: string[];
  vibeTags: string[];
  companionTags: string[];
  isDogFriendly: boolean;
  isDrinkingOptional: boolean;
  isAlcoholFree: boolean;
}

interface EventInput {
  title: string;
  description: string;
  venueName: string;
  category: string;
  tags: string[];
  priceRange: string;
  neighborhood?: string | null;
  // PRD 2 Phase 4 — pass regional context so the model can rate
  // worth-the-drive and lean into travel-framed oneLiners.
  townName?: string | null;
  driveTimeFromDenver?: number | null;
  isRegional?: boolean;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(event: EventInput): string {
  const regionalBlock = event.isRegional
    ? `

REGIONAL CONTEXT:
This event is NOT in Denver — it's in ${event.townName ?? "a nearby town"}, approximately ${event.driveTimeFromDenver ?? "unknown"} minutes from downtown Denver each way. The user would need to drive to get there. Rate carefully:
- "worthTheDriveScore" (1-10): How compelling is this for someone in Denver who would drive ${event.driveTimeFromDenver ?? "out"} minutes each way? Consider uniqueness (is it something Denver doesn't have?), scale (major festival vs. small meetup), and time-investment payoff. 1 = "hard pass, too far for what this is." 10 = "absolutely worth the drive, don't miss it."
- For "oneLiner": lean into the travel framing ONLY if worthTheDriveScore >= 7. Example: "Fort Collins art festival that's worth the I-25 drive" or "The Aspen weekend that justifies the traffic." Otherwise keep the hook neutral.`
    : "";

  const regionalJsonFields = event.isRegional
    ? `,
  "worthTheDriveScore": 6`
    : "";

  return `You are a Denver local helping tag events for a social discovery app called Pulse.

Based on the following event, provide enrichment data. Pick ONLY tags from the provided lists.

Event:
- Title: ${event.title}
- Current Description: ${event.description || "(none)"}
- Venue: ${event.venueName}
- Category: ${event.category}
- Existing Tags: ${event.tags.join(", ") || "(none)"}
- Price: ${event.priceRange}
- Neighborhood: ${event.neighborhood || "Denver"}${regionalBlock}

IMPORTANT CATEGORY RULES:
- Bars, cocktail lounges, speakeasies, breweries, taprooms, pubs, wine bars, beer gardens, and any venue where drinking is the PRIMARY activity should ALWAYS be categorized as BARS, never as ACTIVITY_VENUE or OTHER.
- Comedy clubs, improv theaters = COMEDY
- Run clubs, sports leagues, social groups = SOCIAL
- Escape rooms, axe throwing, archery, curling, bowling = ACTIVITY_VENUE

Provide a JSON response with:
1. "description": A fun, engaging 1-2 sentence description. Capture what makes it worth attending.
2. "oneLiner": A punchy 10-15 word hook that makes someone want to go. Be specific and compelling, not generic.
3. "category": The correct category from [ART, LIVE_MUSIC, BARS, FOOD, COFFEE, OUTDOORS, FITNESS, SEASONAL, POPUP, ACTIVITY_VENUE, COMEDY, SOCIAL, WELLNESS, RESTAURANT, OTHER]
4. "qualityScore": 1-10. How interesting/worth-attending is this for a young professional in Denver? 1-3=junk (webinars, MLM, corporate), 4-6=decent but generic, 7-10=genuinely interesting or unique.
5. "noveltyScore": 1-10. How unique or surprising is this? Regular restaurant=2, coffee shop=1, curling club=9, archery dodgeball=10, rage room=8, hiking=4, escape room=7.
6. "vibeTags": 2-4 tags from: ${VIBE_TAGS.join(", ")}
7. "companionTags": 2-4 tags from: ${COMPANION_TAGS.join(", ")}
8. "isDogFriendly": boolean - true if dogs are likely welcome
9. "isDrinkingOptional": boolean - true if the event works fine without drinking
10. "isAlcoholFree": boolean - true if no alcohol is involved${event.isRegional ? `\n11. "worthTheDriveScore": 1-10 per the REGIONAL CONTEXT rules above.` : ""}

Respond ONLY with valid JSON:
{
  "description": "...",
  "oneLiner": "...",
  "category": "...",
  "qualityScore": 5,
  "noveltyScore": 5,
  "vibeTags": [],
  "companionTags": [],
  "isDogFriendly": false,
  "isDrinkingOptional": false,
  "isAlcoholFree": false${regionalJsonFields}
}`;
}

// ---------------------------------------------------------------------------
// Enrichment function
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function enrichEvent(
  event: EventInput,
): Promise<EventEnrichment | null> {
  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-nano-2026-03-17",
      messages: [{ role: "user", content: buildPrompt(event) }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // Validate tags against allowed vocabularies
    const vibeTags: string[] = (raw.vibeTags ?? []).filter((t: string) =>
      VIBE_TAGS.includes(t),
    );
    const companionTags: string[] = (raw.companionTags ?? []).filter(
      (t: string) => COMPANION_TAGS.includes(t),
    );

    // Merge vibe + companion + social-relevant tags into a flat `tags` array
    // so the scoring system can read them from event.tags
    const allTags = new Set([...vibeTags, ...companionTags]);
    // Also include any social tags the model may have generated implicitly
    for (const tag of companionTags) {
      if (SOCIAL_TAGS.includes(tag)) allTags.add(tag);
    }

    return {
      description: typeof raw.description === "string" ? raw.description : "",
      oneLiner: typeof raw.oneLiner === "string" ? raw.oneLiner : null,
      category: typeof raw.category === "string" ? raw.category : null,
      qualityScore: typeof raw.qualityScore === "number" ? Math.min(10, Math.max(1, Math.round(raw.qualityScore))) : null,
      noveltyScore: typeof raw.noveltyScore === "number" ? Math.min(10, Math.max(1, Math.round(raw.noveltyScore))) : null,
      worthTheDriveScore:
        event.isRegional && typeof raw.worthTheDriveScore === "number"
          ? Math.min(10, Math.max(1, Math.round(raw.worthTheDriveScore)))
          : null,
      tags: Array.from(allTags),
      vibeTags,
      companionTags,
      isDogFriendly: raw.isDogFriendly === true,
      isDrinkingOptional: raw.isDrinkingOptional === true,
      isAlcoholFree: raw.isAlcoholFree === true,
    };
  } catch (error) {
    console.error(
      `Error enriching event "${event.title}":`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
