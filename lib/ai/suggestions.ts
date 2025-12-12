/**
 * AI-powered suggestions service using OpenAI
 *
 * This module handles AI curation of weekly and monthly picks.
 * It includes:
 * - Zod validation for strict output schema
 * - Fallback to deterministic selection on AI failure
 * - Constraint enforcement (only candidate IDs, no PASSed items)
 */

import OpenAI from "openai";
import { z } from "zod";
import { Category, ItemType } from "@prisma/client";

// ============================================================================
// CONFIGURATION
// ============================================================================

const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const AI_SUGGESTIONS_ENABLED = process.env.AI_SUGGESTIONS_ENABLED === "true";

// ============================================================================
// TYPES AND SCHEMAS
// ============================================================================

// Output schema from AI
const SuggestionOutputSchema = z.object({
  weeklyPickIds: z.array(z.string()).min(1).max(10),
  monthlyPickIds: z.array(z.string()).min(1).max(20),
  reasonsById: z.record(z.string(), z.string()),
  summaryText: z.string().min(10).max(500),
});

export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;

// Candidate item structure for AI input
export interface CandidateItem {
  id: string;
  type: ItemType;
  title: string;
  category: Category;
  tags: string[];
  startTime?: Date | null;
  venueName: string;
  priceRange: string;
  score: number;
}

// User taste summary for AI context
export interface UserTasteSummary {
  likedCategories: Category[];
  dislikedCategories: Category[];
  preferredTags: string[];
  avgRating: number | null;
  totalDone: number;
  totalPass: number;
  recentActivity: string[];
}

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

// ============================================================================
// AI SUGGESTION GENERATION
// ============================================================================

function buildSystemPrompt(): string {
  return `You are a Denver events and places curator for the Pulse app. Your job is to select the best items for a user based on their taste profile.

CRITICAL CONSTRAINTS:
1. You may ONLY select from the provided candidate IDs
2. You must NEVER invent or create new IDs
3. Each ID in your response MUST exist in the candidates list
4. Provide a short, compelling reason for each pick (1 sentence)
5. Write a 2-3 sentence summary of your curation

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema:
{
  "weeklyPickIds": ["id1", "id2", ...],  // 6-10 picks for this week
  "monthlyPickIds": ["id1", "id2", ...], // 10-20 picks for this month
  "reasonsById": {
    "id1": "Short reason for this pick",
    "id2": "Short reason for this pick"
  },
  "summaryText": "2-3 sentence summary of your curation approach"
}

Do not include any text outside the JSON object.`;
}

function buildUserPrompt(
  tasteSummary: UserTasteSummary,
  candidates: CandidateItem[]
): string {
  const candidateList = candidates
    .map((c) => {
      const dateStr = c.startTime
        ? new Date(c.startTime).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
        : "Anytime";

      return `- ID: ${c.id}
  Type: ${c.type}
  Title: ${c.title}
  Category: ${c.category}
  Tags: ${c.tags.join(", ")}
  Date: ${dateStr}
  Venue: ${c.venueName}
  Price: ${c.priceRange}
  Match Score: ${c.score.toFixed(0)}`;
    })
    .join("\n\n");

  return `USER TASTE PROFILE:
- Liked categories: ${tasteSummary.likedCategories.join(", ") || "None specified"}
- Disliked categories: ${tasteSummary.dislikedCategories.join(", ") || "None specified"}
- Preferred tags: ${tasteSummary.preferredTags.join(", ") || "None specified"}
- Average rating given: ${tasteSummary.avgRating?.toFixed(1) || "No ratings yet"}
- Items completed: ${tasteSummary.totalDone}
- Items passed: ${tasteSummary.totalPass}
- Recent activity: ${tasteSummary.recentActivity.slice(0, 5).join(", ") || "No recent activity"}

CANDIDATE ITEMS (${candidates.length} total):
Select from these ONLY:

${candidateList}

Please select 6-10 for weekly picks and 10-20 for monthly picks.
Prioritize variety, relevance to user taste, and upcoming dates for weekly picks.`;
}

/**
 * Generate AI-curated suggestions
 * Returns null if AI fails or is disabled
 */
export async function generateAISuggestions(
  tasteSummary: UserTasteSummary,
  candidates: CandidateItem[]
): Promise<SuggestionOutput | null> {
  // Check if AI is enabled
  if (!AI_SUGGESTIONS_ENABLED) {
    console.log("[AI Suggestions] AI is disabled via env");
    return null;
  }

  const client = getOpenAIClient();
  if (!client) {
    console.log("[AI Suggestions] No OpenAI API key configured");
    return null;
  }

  if (candidates.length === 0) {
    console.log("[AI Suggestions] No candidates provided");
    return null;
  }

  // Build valid candidate ID set for validation
  const validIds = new Set(candidates.map((c) => c.id));

  try {
    console.log(
      `[AI Suggestions] Calling ${AI_MODEL} with ${candidates.length} candidates`
    );

    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(tasteSummary, candidates) },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[AI Suggestions] Empty response from OpenAI");
      return null;
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("[AI Suggestions] Failed to parse JSON:", parseError);
      return null;
    }

    // Validate with zod
    const validation = SuggestionOutputSchema.safeParse(parsed);
    if (!validation.success) {
      console.error(
        "[AI Suggestions] Schema validation failed:",
        validation.error.errors
      );
      return null;
    }

    const output = validation.data;

    // CRITICAL: Validate that all IDs exist in candidates
    const invalidWeekly = output.weeklyPickIds.filter((id) => !validIds.has(id));
    const invalidMonthly = output.monthlyPickIds.filter((id) => !validIds.has(id));

    if (invalidWeekly.length > 0 || invalidMonthly.length > 0) {
      console.error(
        "[AI Suggestions] AI returned invalid IDs:",
        { invalidWeekly, invalidMonthly }
      );
      // Filter out invalid IDs instead of failing completely
      output.weeklyPickIds = output.weeklyPickIds.filter((id) => validIds.has(id));
      output.monthlyPickIds = output.monthlyPickIds.filter((id) => validIds.has(id));

      // If too few valid IDs remain, return null
      if (output.weeklyPickIds.length < 3 || output.monthlyPickIds.length < 5) {
        return null;
      }
    }

    // Remove reasons for invalid IDs
    const validReasonIds = new Set([
      ...output.weeklyPickIds,
      ...output.monthlyPickIds,
    ]);
    output.reasonsById = Object.fromEntries(
      Object.entries(output.reasonsById).filter(([id]) => validReasonIds.has(id))
    );

    console.log(
      `[AI Suggestions] Success: ${output.weeklyPickIds.length} weekly, ${output.monthlyPickIds.length} monthly`
    );

    return output;
  } catch (error) {
    console.error("[AI Suggestions] OpenAI API error:", error);
    return null;
  }
}

// ============================================================================
// DETERMINISTIC FALLBACK REASONS
// ============================================================================

const CATEGORY_REASONS: Record<Category, string[]> = {
  ART: [
    "Perfect for art lovers",
    "A cultural gem",
    "Inspiring creative experience",
  ],
  LIVE_MUSIC: [
    "Great live performance",
    "Music you'll love",
    "Can't miss this show",
  ],
  BARS: [
    "Top nightlife pick",
    "Perfect for a night out",
    "Craft drinks await",
  ],
  FOOD: [
    "Delicious culinary experience",
    "Foodie favorite",
    "Must-try flavors",
  ],
  COFFEE: [
    "Coffee culture at its best",
    "Perfect caffeine fix",
    "Cozy coffee spot",
  ],
  OUTDOORS: [
    "Get outside and explore",
    "Nature calling",
    "Adventure awaits",
  ],
  FITNESS: [
    "Stay active and healthy",
    "Great workout option",
    "Fitness goals",
  ],
  SEASONAL: [
    "Limited time experience",
    "Seasonal favorite",
    "Don't miss this",
  ],
  POPUP: [
    "Unique pop-up experience",
    "Here today, gone tomorrow",
    "Exclusive find",
  ],
  OTHER: [
    "Something special",
    "Unique experience",
    "Worth checking out",
  ],
  RESTAURANT: [
    "Top dining pick",
    "Delicious food awaits",
    "Culinary excellence",
  ],
  ACTIVITY_VENUE: [
    "Fun activity spot",
    "Great for groups",
    "Entertainment awaits",
  ],
};

/**
 * Generate a deterministic reason for a candidate
 */
export function generateDeterministicReason(
  candidate: CandidateItem,
  index: number
): string {
  const reasons = CATEGORY_REASONS[candidate.category] || CATEGORY_REASONS.OTHER;
  return reasons[index % reasons.length];
}

/**
 * Generate deterministic fallback suggestions
 * Used when AI is disabled or fails
 */
export function generateDeterministicSuggestions(
  candidates: CandidateItem[],
  tasteSummary: UserTasteSummary
): SuggestionOutput {
  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  // Get events (for weekly - prefer upcoming)
  const events = sorted
    .filter((c) => c.type === "EVENT" && c.startTime)
    .sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : Infinity;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : Infinity;
      return aTime - bTime;
    });

  // Get top items for monthly (mix of events and places)
  const weeklyPicks = events.slice(0, 8);

  // Monthly picks: diversified by category
  const categoryBuckets: Map<Category, CandidateItem[]> = new Map();
  for (const item of sorted) {
    const bucket = categoryBuckets.get(item.category) || [];
    bucket.push(item);
    categoryBuckets.set(item.category, bucket);
  }

  const monthlyPicks: CandidateItem[] = [];
  const maxPerCategory = 3;

  // Round-robin selection from categories
  let added = true;
  while (monthlyPicks.length < 15 && added) {
    added = false;
    for (const [category, items] of categoryBuckets) {
      const inCategory = monthlyPicks.filter((p) => p.category === category).length;
      if (inCategory < maxPerCategory && items.length > 0) {
        const item = items.shift()!;
        if (!monthlyPicks.find((p) => p.id === item.id)) {
          monthlyPicks.push(item);
          added = true;
        }
      }
    }
  }

  // Generate reasons
  const reasonsById: Record<string, string> = {};
  weeklyPicks.forEach((pick, i) => {
    reasonsById[pick.id] = generateDeterministicReason(pick, i);
  });
  monthlyPicks.forEach((pick, i) => {
    if (!reasonsById[pick.id]) {
      reasonsById[pick.id] = generateDeterministicReason(pick, i);
    }
  });

  // Generate summary
  const topCategories = tasteSummary.likedCategories.slice(0, 3);
  const summaryText = topCategories.length > 0
    ? `Based on your love for ${topCategories.join(" and ")}, we've curated these picks just for you. Discover new favorites this week and explore more throughout the month.`
    : "Here are our top picks for you this week and month. We've selected a diverse mix of events and places to help you discover Denver.";

  return {
    weeklyPickIds: weeklyPicks.map((p) => p.id),
    monthlyPickIds: monthlyPicks.map((p) => p.id),
    reasonsById,
    summaryText,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AI_SUGGESTIONS_ENABLED, AI_MODEL };
