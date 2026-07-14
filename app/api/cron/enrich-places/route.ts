import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { runEnrichment, type EnrichmentMode } from "@/lib/enrich-place";

// Enrichment was manual-CLI-only before Wave 6B — on no cron at all — which is
// why a place added by the scraper could sit un-enriched indefinitely, showing
// no description, no chips, and false for every situational attribute.
//
// Weekly. Both modes are idempotent by construction: "full" only picks up places
// with a null pulseDescription, "attributes" only those with a null
// situationalEnrichedAt. A steady-state run therefore does nothing and costs
// nothing; it only bites on places the scraper has newly added.

export const maxDuration = 300;

// Sized to FIT inside maxDuration, which the first cut of this did not: at a
// realistic 2-3s per gpt-4o-mini call, 120 places overran 300s and the function
// was killed mid-batch — no corruption (each update autocommits, and both gates
// are null-column based, so it resumes cleanly), but it 504s every week and the
// `truncated` warning below never even gets to fire.
//
// 60 x ~2.5s ~= 150s, comfortably inside the ceiling. The cron is weekly and the
// backlog only grows by newly-scraped places, so a bounded batch still drains it.
// The one-off ~460-place backfill runs from the CLI, which has no timeout.
const BATCH_LIMIT = 60;

// The OpenAI Node SDK defaults to a 600_000ms request timeout — TWICE our
// maxDuration — so a single hung request would eat the entire function budget.
const OPENAI_TIMEOUT_MS = 20_000;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
  }

  const mode: EnrichmentMode =
    request.nextUrl.searchParams.get("mode") === "attributes" ? "attributes" : "full";

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });
    const result = await runEnrichment(prisma, openai, {
      mode,
      limit: BATCH_LIMIT,
      // The loop is strictly serial at well under 1 rps, nowhere near any tier's
      // rate limit, so an inter-call delay buys nothing but wall-clock.
      delayMs: 0,
      onProgress: (m) => console.info(`[enrich-places] ${m}`),
    });

    const truncated = result.processed === BATCH_LIMIT;
    if (truncated) {
      console.warn(
        `[enrich-places] batch hit the ${BATCH_LIMIT} cap — more places remain for next week's run`,
      );
    }

    // An OpenAI outage or a sustained 429 burns every place in the batch as
    // "failed" and would otherwise return 200 {enriched: 0} — which every
    // monitor on earth reads as green. Fail loudly instead.
    if (result.processed > 0 && result.enriched === 0) {
      console.error(`[enrich-places] every one of ${result.processed} place(s) failed`);
      return NextResponse.json(
        { success: false, mode, error: "All enrichment calls failed", ...result },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, mode, truncated, ...result });
  } catch (error) {
    console.error("[enrich-places] error:", error);
    return NextResponse.json(
      {
        error: "Enrichment failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
