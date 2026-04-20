import { NextRequest, NextResponse } from "next/server";
import { runRedditMining } from "@/lib/discoveries/pipelines/reddit";

// PRD 3 Phase 2 — Reddit mining pipeline entry point.
// Weekly cadence is the design target (not daily). Phase 6 wires this into
// vercel.json as part of the full `/api/discoveries/refresh` orchestrator.
// Until then, this endpoint is triggered manually (curl with CRON_SECRET or
// the discoveries:reddit CLI script).
//
// Cost + rate: each run issues 1 LLM call per qualifying post across ~12
// subreddits, with ≥1s delay between Reddit requests. Expect 5–15 minutes
// runtime and ~200–400 OpenAI mini/nano calls per weekly run.

export const maxDuration = 300;

async function handleRequest(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional smoke-test cap: /api/discoveries/refresh-reddit?maxPosts=3
  const url = new URL(request.url);
  const maxPostsParam = url.searchParams.get("maxPosts");
  const maxPostsPerSub = maxPostsParam ? Number(maxPostsParam) : undefined;

  try {
    const result = await runRedditMining({ maxPostsPerSub });
    return NextResponse.json({
      success: true,
      runBatchId: result.runBatchId,
      rawCandidateCount: result.rawCount,
      mergedCandidateCount: result.candidates.length,
      droppedCount: result.droppedCount,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 20),
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[discoveries/refresh-reddit] error:", error);
    return NextResponse.json(
      {
        error: "Reddit mining pipeline failed",
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
