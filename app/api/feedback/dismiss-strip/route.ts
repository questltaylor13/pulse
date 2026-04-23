import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PRD 5 Phase 2 §2.1 — dismiss the profile-completion strip. Stores the
// timestamp; strip hides for 48h after, then re-renders automatically.

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { profileStripDismissedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
