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

// ~460 places at ~1.2s each would blow the 300s ceiling, so cap the batch. The
// cron is weekly and the backlog only grows by new places, so a bounded batch
// still drains it — and the one-off 460-place backfill runs from the CLI, which
// has no timeout. Logged rather than silent: a truncated batch must not read as
// "everything is enriched".
const BATCH_LIMIT = 120;

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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await runEnrichment(prisma, openai, {
      mode,
      limit: BATCH_LIMIT,
      delayMs: 300,
      onProgress: (m) => console.info(`[enrich-places] ${m}`),
    });

    const truncated = result.processed === BATCH_LIMIT;
    if (truncated) {
      console.warn(
        `[enrich-places] batch hit the ${BATCH_LIMIT} cap — more places remain for next week's run`,
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
