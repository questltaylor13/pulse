import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAllScrapers } from "@/lib/scrapers";

export const maxDuration = 300;

/**
 * PRD 2 §6.4 — manual refresh trigger. Auth-gated alternative to the cron.
 * Useful when the feed feels stale mid-week and Quest wants a fresh pull
 * without waiting for the nightly run.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runAllScrapers();
    revalidateTag("home-feed");
    return NextResponse.json({ ...result, revalidated: true });
  } catch (error) {
    console.error("[admin/scrape-now] error:", error);
    return NextResponse.json(
      {
        error: "Scrape failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
