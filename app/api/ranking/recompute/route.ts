import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { precomputeUser } from "@/lib/ranking/precompute";

// Wave 2 — self-serve forced re-rank for the signed-in user.
//
// Called after a burst of feedback (e.g. the taste swiper) to flush a SINGLE
// recompute instead of one per tap. Forces past the freshness gate — it's an
// explicit user action. Per-tap swiper writes deliberately skip the automatic
// trigger (see lib/feedback/api.ts) so this is the one recompute that lands.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await precomputeUser(session.user.id, { force: true });
  return NextResponse.json({ ok: !result.error, result });
}
