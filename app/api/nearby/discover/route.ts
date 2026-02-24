import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { discoverNearby } from "@/lib/proximity";
import { DEFAULT_RADIUS_MILES } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseFloat(searchParams.get("radius") || "") || DEFAULT_RADIUS_MILES;
  const type = searchParams.get("type") || undefined;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  try {
    const items = await discoverNearby(session.user.id, { lat, lng }, radius, type);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Discover nearby error:", error);
    return NextResponse.json({ error: "Failed to discover nearby places" }, { status: 500 });
  }
}
