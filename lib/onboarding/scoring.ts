import type { ContextSegment } from "@prisma/client";
import type { VibePair, DerivedScores } from "./types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function computeDerivedScores(
  vibePreferences: VibePair[],
  contextSegment: ContextSegment
): DerivedScores {
  const selected = new Map(vibePreferences.map((v) => [v.pair, v.selected]));

  // Openness: Start at 0.5. Option A → -0.1, Option B → +0.1 for each pair.
  let openness = 0.5;
  for (let pair = 1; pair <= 4; pair++) {
    const sel = selected.get(pair);
    if (sel === "A") openness -= 0.1;
    if (sel === "B") openness += 0.1;
  }

  // Extraversion: Start at 0.5.
  // Pair 1: A → +0.1, B → -0.1
  // Pair 2: A → +0.15, B → -0.15
  // Pair 3 & 4: neutral
  let extraversion = 0.5;
  const p1 = selected.get(1);
  if (p1 === "A") extraversion += 0.1;
  if (p1 === "B") extraversion -= 0.1;
  const p2 = selected.get(2);
  if (p2 === "A") extraversion += 0.15;
  if (p2 === "B") extraversion -= 0.15;

  // Novelty: Start at 0.5.
  // Pair 2: A → -0.1, B → +0.15
  // Pair 3: A → -0.05, B → +0.1
  // Context segment bonus
  let novelty = 0.5;
  if (p2 === "A") novelty -= 0.1;
  if (p2 === "B") novelty += 0.15;
  const p3 = selected.get(3);
  if (p3 === "A") novelty -= 0.05;
  if (p3 === "B") novelty += 0.1;

  const contextBonus: Record<ContextSegment, number> = {
    NEW_TO_CITY: 0.15,
    IN_A_RUT: 0.1,
    LOCAL_EXPLORER: 0.05,
    VISITING: 0,
  };
  novelty += contextBonus[contextSegment];

  return {
    opennessScore: clamp(openness),
    extraversionScore: clamp(extraversion),
    noveltyScore: clamp(novelty),
  };
}
