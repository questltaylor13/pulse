import { NextRequest, NextResponse } from "next/server";
import { runNicheSites } from "@/lib/discoveries/pipelines/niche-sites";

// PRD 3 Phase 3 — Niche sites pipeline entry point.
// Weekly cadence is the design target (not daily). Phase 6 wires this into
// vercel.json as part of the full `/api/discoveries/refresh` orchestrator.
// Until then, this endpoint is triggered manually (curl with CRON_SECRET or
// the discoveries:niche CLI script).
//
// Each run fetches robots.txt + 1 HTML page per enabled site with a 1.2s
// gap between sites. Expect the full run to finish in under a minute.

export const maxDuration = 120;

async function handleRequest(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNicheSites();
    return NextResponse.json({
      success: true,
      runBatchId: result.runBatchId,
      rawCandidateCount: result.rawCount,
      candidateCount: result.candidates.length,
      errorCount: result.errors.length,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("[discoveries/refresh-niche-sites] error:", error);
    return NextResponse.json(
      {
        error: "Niche sites pipeline failed",
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
