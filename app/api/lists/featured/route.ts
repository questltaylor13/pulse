import { NextResponse } from "next/server";
import { fetchFeaturedLists } from "@/lib/social/featured-lists";

export const dynamic = "force-dynamic";

// The query now lives in lib/social/featured-lists.ts so the home rail can use
// it server-side without a self-fetch. Previously this route selected only
// `event` on preview items, so place-backed list items rendered as "Unknown".
export async function GET() {
  const lists = await fetchFeaturedLists();
  return NextResponse.json({ lists });
}
