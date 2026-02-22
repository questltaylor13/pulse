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
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(event: EventInput): string {
  return `You are a Denver local helping tag events for a social discovery app called Pulse.

Based on the following event, provide enrichment data. Pick ONLY tags from the provided lists.

Event:
- Title: ${event.title}
- Current Description: ${event.description || "(none)"}
- Venue: ${event.venueName}
- Category: ${event.category}
- Existing Tags: ${event.tags.join(", ") || "(none)"}
- Price: ${event.priceRange}
- Neighborhood: ${event.neighborhood || "Denver"}

Provide a JSON response with:
1. "description": A fun, engaging 1-2 sentence description of the event. Capture what makes it worth attending.
2. "vibeTags": 2-4 tags from: ${VIBE_TAGS.join(", ")}
3. "companionTags": 2-4 tags from: ${COMPANION_TAGS.join(", ")}
4. "isDogFriendly": boolean - true if dogs are likely welcome (outdoor festivals, patios, parks)
5. "isDrinkingOptional": boolean - true if the event works fine without drinking
6. "isAlcoholFree": boolean - true if no alcohol is involved (yoga, fitness, museum, etc.)

Respond ONLY with valid JSON:
{
  "description": "...",
  "vibeTags": [],
  "companionTags": [],
  "isDogFriendly": false,
  "isDrinkingOptional": false,
  "isAlcoholFree": false
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(event) }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 400,
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
