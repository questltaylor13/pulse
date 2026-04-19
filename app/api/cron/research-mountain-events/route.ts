import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  ingestResearchedEvents,
  researchMountainEvents,
} from "@/lib/llm-research/mountain-events";

export const maxDuration = 300;

/**
 * Weekly cron: calls Claude with web search to discover mountain-town events
 * that visitor-bureau feeds miss (festivals, races, seasonal happenings).
 * Runs Tuesdays at 8am UTC per PRD 2 §3.3 (separate day from Tier 1/2 scrapers
 * to spread load).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const candidates = await researchMountainEvents();
    const result = await ingestResearchedEvents(prisma, candidates);
    revalidateTag("home-feed");
    return NextResponse.json({
      candidates: candidates.length,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      revalidated: true,
    });
  } catch (error) {
    console.error("[research-mountain-events] error:", error);
    return NextResponse.json(
      {
        error: "Research failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
