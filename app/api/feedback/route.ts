import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  deleteFeedback,
  upsertFeedback,
} from "@/lib/feedback/api";
import { getProfileCompletion } from "@/lib/feedback/profile-completion";

// PRD 5 Phase 0 — behavioral feedback endpoint.
//
// Replaces an older MORE/LESS/HIDE stub that wrote to the UserFeedback model
// (0 rows, 0 callers — safe to swap). Session-gated. Writes to
// UserItemStatus via lib/feedback/api.ts; handles both Item and Discovery
// polymorphic refs.

// Session lookup reads cookies — must render per-request, not at build.
export const dynamic = "force-dynamic";

const refSchema = z.union([
  z.object({ itemId: z.string().min(1) }).strict(),
  z.object({ eventId: z.string().min(1) }).strict(),
  z.object({ placeId: z.string().min(1) }).strict(),
  z.object({ discoveryId: z.string().min(1) }).strict(),
]);

const postSchema = z.object({
  ref: refSchema,
  status: z.enum(["WANT", "PASS", "DONE"]),
  source: z.enum(["FEED_CARD", "PROFILE_SWIPER", "DETAIL_PAGE"]),
});

const deleteSchema = z.object({
  ref: refSchema,
});

async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id };
}

export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.res;

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const row = await upsertFeedback({
      userId: auth.userId,
      ref: parsed.data.ref,
      status: parsed.data.status,
      source: parsed.data.source,
    });
    const profileCompletion = await getProfileCompletion(auth.userId);
    return NextResponse.json({ feedback: row, profileCompletion });
  } catch (err) {
    console.error("[api/feedback POST] error:", err);
    return NextResponse.json(
      {
        error: "Feedback write failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.res;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteFeedback({
      userId: auth.userId,
      ref: parsed.data.ref,
    });
    const profileCompletion = await getProfileCompletion(auth.userId);
    return NextResponse.json({ deleted, profileCompletion });
  } catch (err) {
    console.error("[api/feedback DELETE] error:", err);
    return NextResponse.json(
      {
        error: "Feedback delete failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
