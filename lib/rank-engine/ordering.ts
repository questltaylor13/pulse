/**
 * Wave 4 Rate & Rank — category-ordering core shared by the service and the
 * feedback layer. Lives in its own module (importing only prisma + the pure
 * score math) so lib/feedback/api.ts can retract a ranked entry when a DONE
 * is deleted WITHOUT creating an import cycle (service.ts imports
 * upsertFeedback from api.ts).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, RankCategory, RankSentiment } from "@prisma/client";
import { assertBucketInvariant, deriveScores } from "./scores";

/** Rank engine refs are content-native only — no legacy Item bridge. */
export type RankRef =
  | { eventId: string }
  | { placeId: string }
  | { discoveryId: string };

export function refWhere(
  userId: string,
  ref: RankRef
): Prisma.UserRankedEntryWhereInput {
  if ("eventId" in ref) return { userId, eventId: ref.eventId };
  if ("placeId" in ref) return { userId, placeId: ref.placeId };
  return { userId, discoveryId: ref.discoveryId };
}

export async function loadCategoryEntries(
  tx: Prisma.TransactionClient,
  userId: string,
  category: RankCategory
) {
  return tx.userRankedEntry.findMany({
    where: { userId, category },
    orderBy: { position: "asc" },
  });
}

/**
 * Renumber + rescore an ordered category list inside a transaction. `ordered`
 * is the desired final order, best first. Only rows whose position or score
 * changed are written.
 */
export async function persistOrder(
  tx: Prisma.TransactionClient,
  ordered: {
    id: string;
    sentiment: RankSentiment;
    position: number;
    score: number;
  }[]
): Promise<void> {
  assertBucketInvariant(ordered.map((e) => e.sentiment));
  const scores = deriveScores(ordered.map((e) => e.sentiment));
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].position !== i || ordered[i].score !== scores[i]) {
      await tx.userRankedEntry.update({
        where: { id: ordered[i].id },
        data: { position: i, score: scores[i] },
      });
    }
  }
}

/**
 * Delete the ranked entry for a content ref (if any) and renumber its
 * category. Called from lib/feedback/api.ts when a DONE is retracted so the
 * item doesn't linger in /rankings after the visit itself was undone.
 * Returns true when an entry was removed.
 */
export async function removeRankedEntryForRef(
  userId: string,
  ref: RankRef
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.userRankedEntry.findFirst({
      where: refWhere(userId, ref),
    });
    if (!entry) return false;
    await tx.userRankedEntry.delete({ where: { id: entry.id } });
    const rest = (
      await loadCategoryEntries(tx, userId, entry.category)
    ).filter((e) => e.id !== entry.id);
    await persistOrder(tx, rest);
    return true;
  });
}
