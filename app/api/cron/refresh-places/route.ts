import { NextResponse } from "next/server";
import { refreshPlacesChunk, CHUNK_MAP } from "@/lib/places-refresh";

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function handleRefresh(request: Request) {
  const { searchParams } = new URL(request.url);
  const chunkParam = searchParams.get("chunk");
  const chunkIndex = chunkParam !== null ? parseInt(chunkParam, 10) : NaN;

  if (isNaN(chunkIndex) || !(chunkIndex in CHUNK_MAP)) {
    return NextResponse.json(
      { error: "Invalid chunk parameter. Use ?chunk=0, ?chunk=1, or ?chunk=2" },
      { status: 400 },
    );
  }

  try {
    const result = await refreshPlacesChunk(CHUNK_MAP[chunkIndex]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Places refresh error:", error);
    return NextResponse.json(
      { error: "Places refresh failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// Vercel cron sends GET requests
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleRefresh(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleRefresh(request);
}
