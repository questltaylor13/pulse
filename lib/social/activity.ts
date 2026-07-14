/**
 * Wave 5 — activity emission for the following feed.
 *
 * RANKED_ITEM rows are *pointers*, not snapshots: they record that user U
 * ranked entry E at time T, and nothing about where E landed. The feed joins
 * to UserRankedEntry at read time for current rank/score/title. This is what
 * keeps the feed truthful under the Beli mechanic, which reorders lists on
 * every duel — a snapshot would strand a false claim in every follower's
 * timeline after each re-rank.
 *
 * Emission is best-effort by design. Ranking your own list is the primary
 * action; telling followers about it is secondary, and must never be able to
 * fail the placement that produced it.
 */

import { prisma } from "@/lib/prisma";
import { isSocialV1Enabled } from "@/lib/ranking/flags";

/**
 * Record that `userId` ranked `rankedEntryId`, once.
 *
 * Idempotent on the entry's unique index: re-ranking the same item during the
 * duel loop updates what the feed *shows* (via read-time hydration) without
 * creating a second row and without bumping `createdAt`, so a followed user
 * re-sorting their top 10 cannot flood the people following them.
 *
 * Never throws.
 */
export async function emitRankedItemActivity(params: {
  userId: string;
  rankedEntryId: string;
}): Promise<void> {
  if (!isSocialV1Enabled()) return;

  const { userId, rankedEntryId } = params;
  try {
    await prisma.userActivity.upsert({
      where: { rankedEntryId },
      // Deliberately empty: an existing row keeps its original createdAt, so
      // the feed reflects when the verdict was first formed, not the last
      // time the list got re-sorted around it.
      update: {},
      create: {
        userId,
        type: "RANKED_ITEM",
        rankedEntryId,
      },
    });
  } catch (err) {
    console.warn("[social.emitRankedItemActivity] failed:", err);
  }
}
