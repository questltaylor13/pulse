import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getListItemsNearby } from "@/lib/proximity";
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

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  try {
    const groups = await getListItemsNearby(session.user.id, { lat, lng }, radius);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Nearby lists error:", error);
    return NextResponse.json({ error: "Failed to fetch nearby list items" }, { status: 500 });
  }
}
