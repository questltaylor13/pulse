import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Refresh influencer guide counts
    const influencers = await prisma.influencer.findMany({
      select: { id: true },
    });
    let influencersUpdated = 0;
    for (const inf of influencers) {
      const count = await prisma.guide.count({
        where: { creatorId: inf.id, isPublished: true },
      });
      await prisma.influencer.update({
        where: { id: inf.id },
        data: { guideCount: count },
      });
      influencersUpdated++;
    }

    // Refresh guide save counts
    const guides = await prisma.guide.findMany({ select: { id: true } });
    let guidesUpdated = 0;
    for (const g of guides) {
      const count = await prisma.userSavedGuide.count({
        where: { guideId: g.id },
      });
      await prisma.guide.update({
        where: { id: g.id },
        data: { saveCount: count },
      });
      guidesUpdated++;
    }

    return NextResponse.json({ success: true, influencersUpdated, guidesUpdated });
  } catch (error) {
    console.error("[refresh-guide-counts] error:", error);
    return NextResponse.json(
      {
        error: "Refresh failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
