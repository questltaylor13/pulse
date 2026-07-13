/**
 * Wave 4 Rate & Rank — pure planning logic for the stars→entries backfill
 * (decision D9). Kept separate from scripts/backfill-ranked-entries.ts so
 * the mapping and ordering are unit-testable without a database.
 */

import type { RankCategory, RankSentiment } from "@prisma/client";
import { toRankCategory } from "./categories";
import { bucketRank, deriveScores } from "./scores";

export function starsToSentiment(rating: number): RankSentiment {
  if (rating >= 4) return "LIKED";
  if (rating >= 3) return "FINE";
  return "DISLIKED";
}

export interface BackfillInput {
  refKind: "event" | "place" | "discovery";
  refId: string;
  rating: number;
  updatedAt: Date;
  contentCategory: string | null;
  title: string | null;
  imageUrl: string | null;
  town: string | null;
}

export interface BackfillEntry extends BackfillInput {
  sentiment: RankSentiment;
  position: number;
  score: number;
}

export interface BackfillCategoryPlan {
  category: RankCategory;
  entries: BackfillEntry[];
}

/**
 * Group rated rows into rank categories and order them: sentiment bucket
 * first (stars desc within bucket), earlier updatedAt breaking ties — the
 * earlier rating has "been on the list" longer. Positions are dense and
 * scores derived exactly as the live engine would.
 */
export function planBackfill(rows: BackfillInput[]): BackfillCategoryPlan[] {
  const byCategory = new Map<RankCategory, BackfillInput[]>();
  for (const r of rows) {
    const category = toRankCategory(r.contentCategory);
    const list = byCategory.get(category) ?? [];
    list.push(r);
    byCategory.set(category, list);
  }

  return [...byCategory.entries()].map(([category, list]) => {
    const ordered = [...list].sort((a, b) => {
      const bucket =
        bucketRank(starsToSentiment(a.rating)) -
        bucketRank(starsToSentiment(b.rating));
      if (bucket !== 0) return bucket;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    });
    const scores = deriveScores(
      ordered.map((r) => starsToSentiment(r.rating))
    );
    return {
      category,
      entries: ordered.map((r, i) => ({
        ...r,
        sentiment: starsToSentiment(r.rating),
        position: i,
        score: scores[i],
      })),
    };
  });
}
