import { NextResponse } from "next/server";
import { runAllScrapers } from "@/lib/scrapers";

export async function POST(request: Request) {
  // Verify authorization - check for cron secret or admin session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllScrapers();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Scraping failed" },
      { status: 500 }
    );
  }
}
