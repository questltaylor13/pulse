import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Wave 4 Rate & Rank — "Didn't go" on a rate-your-recent prompt. Stamps
// promptDismissedAt; the WANT row is kept (no PASS taste-penalty for not
// making it out).

export const dynamic = "force-dynamic";

const postSchema = z.object({
  statusId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const res = await prisma.userItemStatus.updateMany({
    where: { id: parsed.data.statusId, userId: session.user.id },
    data: { promptDismissedAt: new Date() },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ dismissed: true });
}
