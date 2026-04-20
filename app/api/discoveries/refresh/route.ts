import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/discoveries/orchestrator";

// PRD 3 Phase 6 — full Discovery orchestrator entry point.
// Weekly cron (Sunday 3am UTC) hits this endpoint, which in turn runs all
// three pipelines (llm-research, reddit, niche-sites) through the Phase 4
// enrichment + verification + dedup flow and upserts Discovery rows.
//
// Total runtime budget: ~5–15 minutes. Fluid Compute keeps us inside
// maxDuration, but watch /admin/scrapers → Hidden Gems for anomalies.

export const maxDuration = 800;

async function handleRequest(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const redditMaxRaw = url.searchParams.get("redditMax");
  const redditMaxPostsPerSub = redditMaxRaw ? Number(redditMaxRaw) : undefined;
  const sourcesParam = url.searchParams.get("sources");
  const enabledSources = sourcesParam
    ? (sourcesParam.split(",").filter((s) =>
        ["LLM_RESEARCH", "REDDIT", "NICHE_SITE"].includes(s)
      ) as Array<"LLM_RESEARCH" | "REDDIT" | "NICHE_SITE">)
    : undefined;

  try {
    const result = await runOrchestrator({
      enabledSources,
      redditMaxPostsPerSub,
    });
    return NextResponse.json({
      success: true,
      runBatchId: result.runBatchId,
      totalUpserted: result.totalUpserted,
      totalUpdated: result.totalUpdated,
      perPipeline: result.perPipeline,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[discoveries/refresh] error:", error);
    return NextResponse.json(
      {
        error: "Discovery orchestrator failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
