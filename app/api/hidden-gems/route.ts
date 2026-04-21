import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  Category,
  DiscoverySubtype,
  EventRegion,
  Prisma,
} from "@prisma/client";

// PRD 3 Phase 5 — public feed of Discoveries for the Hidden Gems tab.
// Filters:
//   subtype:   All | HIDDEN_GEM | NICHE_ACTIVITY | SEASONAL_TIP
//   scope:     near_me (DENVER_METRO + FRONT_RANGE + MOUNTAIN_GATEWAY) | all
//   category:  any Category enum value (optional)
//   limit:     default 24, max 60

const NEAR_ME_REGIONS: EventRegion[] = [
  "DENVER_METRO",
  "FRONT_RANGE",
  "MOUNTAIN_GATEWAY",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subtypeParam = searchParams.get("subtype");
  const scope = searchParams.get("scope") ?? "near_me";
  const categoryParam = searchParams.get("category");
  const limitRaw = Number(searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(60, Math.floor(limitRaw)))
    : 24;

  const where: Prisma.DiscoveryWhereInput = { status: "ACTIVE" };

  if (
    subtypeParam &&
    ["HIDDEN_GEM", "NICHE_ACTIVITY", "SEASONAL_TIP"].includes(subtypeParam)
  ) {
    where.subtype = subtypeParam as DiscoverySubtype;
  }

  if (scope === "near_me") {
    where.region = { in: NEAR_ME_REGIONS };
  }

  if (categoryParam) {
    where.category = categoryParam as Category;
  }

  const discoveries = await prisma.discovery.findMany({
    where,
    orderBy: [
      { qualityScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      subtype: true,
      category: true,
      neighborhood: true,
      townName: true,
      region: true,
      seasonHint: true,
      sourceType: true,
      sourceUrl: true,
      qualityScore: true,
      tags: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ discoveries });
}
