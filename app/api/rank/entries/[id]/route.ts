import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { removeEntry, updateEntryNote } from "@/lib/rank-engine/service";

// Wave 4 Rate & Rank — manage a single ranked entry: remove it from the
// list (keeps the UserItemStatus DONE row) or edit its note.

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  note: z.string().max(500).nullable(),
});

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const removed = await removeEntry({
      userId: session.user.id,
      entryId: params.id,
    });
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch (err) {
    console.error("[api/rank/entries DELETE] error:", err);
    return NextResponse.json(
      { error: "Remove failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await updateEntryNote({
      userId: session.user.id,
      entryId: params.id,
      note: parsed.data.note,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error("[api/rank/entries PATCH] error:", err);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}
