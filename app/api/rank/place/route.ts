import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { confirmPlacement } from "@/lib/rank-engine/service";
import { MAX_COMPARISONS } from "@/lib/rank-engine/insertion";

// Wave 4 Rate & Rank — step 2 of the rating flow. Lands the entry at the
// client-resolved in-bucket index (clamped server-side) and stores the duel
// log. The comparison log is the user's own list ordering — worst case of a
// mischievous client is a self-inflicted odd position, repairable by
// re-ranking.

export const dynamic = "force-dynamic";

const refSchema = z.union([
  z.object({ eventId: z.string().min(1) }).strict(),
  z.object({ placeId: z.string().min(1) }).strict(),
  z.object({ discoveryId: z.string().min(1) }).strict(),
  // Wave 6A — the server promotes an event to its series, and toView hands the
  // client back a { seriesId } ref. Re-ranking from /rankings posts it straight
  // back here, so the schema has to accept it or the button is dead.
  z.object({ seriesId: z.string().min(1) }).strict(),
]);

const postSchema = z.object({
  ref: refSchema,
  inBucketIndex: z.number().int().min(0),
  comparisons: z
    .array(
      z.object({
        opponentEntryId: z.string().min(1),
        outcome: z.enum(["WON", "LOST", "SKIPPED"]),
      })
    )
    .max(MAX_COMPARISONS),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await confirmPlacement({
      userId: session.user.id,
      ref: parsed.data.ref,
      inBucketIndex: parsed.data.inBucketIndex,
      comparisons: parsed.data.comparisons,
    });
    return NextResponse.json({
      ...result,
      listPath: `/rankings?category=${result.categorySlug}`,
    });
  } catch (err) {
    console.error("[api/rank/place POST] error:", err);
    return NextResponse.json(
      {
        error: "Rank place failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
