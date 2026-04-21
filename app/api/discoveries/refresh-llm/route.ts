import { NextRequest, NextResponse } from "next/server";
import { runLLMResearch } from "@/lib/discoveries/pipelines/llm-research";

// PRD 3 Phase 1 — LLM research pipeline entry point.
// Weekly cadence is the design target (not daily). Phase 6 wires this into
// vercel.json as part of the full `/api/discoveries/refresh` orchestrator.
// Until then, this endpoint is triggered manually (curl with CRON_SECRET or
// the discoveries:research CLI script).
//
// Cost guardrail: a single run issues ~6 Claude messages with web_search.
// At the weekly cadence this is well under $5/month.

export const maxDuration = 300; // LLM + web_search can take minutes per query

async function handleRequest(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLLMResearch();
    return NextResponse.json({
      success: true,
      runBatchId: result.runBatchId,
      rawCandidateCount: result.rawCount,
      droppedCount: result.droppedCount,
      errorCount: result.errors.length,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[discoveries/refresh-llm] error:", error);
    return NextResponse.json(
      {
        error: "LLM research pipeline failed",
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
