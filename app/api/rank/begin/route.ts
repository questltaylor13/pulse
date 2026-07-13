import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { beginPlacement } from "@/lib/rank-engine/service";

// Wave 4 Rate & Rank — step 1 of the rating flow. Commits the sentiment
// immediately (DONE + provisional bucket-bottom entry) so an abandoned flow
// still records an honest rating, and returns the duel candidates for the
// client-side binary search (lib/rank-engine/insertion.ts).

export const dynamic = "force-dynamic";

const refSchema = z.union([
  z.object({ eventId: z.string().min(1) }).strict(),
  z.object({ placeId: z.string().min(1) }).strict(),
  z.object({ discoveryId: z.string().min(1) }).strict(),
]);

const postSchema = z.object({
  ref: refSchema,
  sentiment: z.enum(["LIKED", "FINE", "DISLIKED"]),
  source: z.enum(["FEED_CARD", "PROFILE_SWIPER", "DETAIL_PAGE"]),
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
    const result = await beginPlacement({
      userId: session.user.id,
      ref: parsed.data.ref,
      sentiment: parsed.data.sentiment,
      source: parsed.data.source,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/rank/begin POST] error:", err);
    return NextResponse.json(
      {
        error: "Rank begin failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
