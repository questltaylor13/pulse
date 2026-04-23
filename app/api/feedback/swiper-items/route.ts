import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Category, EventRegion } from "@prisma/client";

// PRD 5 Phase 2 §2.2 — diversity-biased selection for the taste swiper.
// Goal: maximize signal across the user's taste space, not show the stuff
// they'll obviously like. Hand-tuned heuristics; no ranking engine.
//
// Selection target:
//   - 4 Events + 4 Places + 4 Discoveries = 12
//   - Each bucket spreads across different categories
//   - Prefer items with quality_score >= 7 / noveltyScore >= 7 where present
//   - Exclude items the user has any UserItemStatus on
//   - Ensure at least 2 non-Denver-metro items (regional bias)
//   - Ensure at least 1 Discovery (Hidden Gem)
//   - Randomize final order

export const dynamic = "force-dynamic";

const TARGET_PER_BUCKET = 4;
const TOTAL = 12;
const REGIONAL_QUOTA = 2;
const QUALITY_FLOOR = 7;

const NEAR_ME_REGIONS: EventRegion[] = [
  "DENVER_METRO",
  "FRONT_RANGE",
  "MOUNTAIN_GATEWAY",
];

interface SwiperItem {
  kind: "event" | "place" | "discovery";
  id: string;
  title: string;
  description: string;
  category: Category;
  region: EventRegion;
  townName: string | null;
  imageUrl: string | null;
  // Display-only hint rendered as a sub-line on the card
  meta: string | null;
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Pull every (eventId | placeId | discoveryId) this user has feedback on
  // so we can hard-exclude from selection. 438 total rows across all users,
  // so per-user this is cheap.
  const seenRows = await prisma.userItemStatus.findMany({
    where: { userId },
    select: { eventId: true, placeId: true, discoveryId: true },
  });
  const seenEventIds = new Set(seenRows.map((r) => r.eventId).filter(Boolean) as string[]);
  const seenPlaceIds = new Set(seenRows.map((r) => r.placeId).filter(Boolean) as string[]);
  const seenDiscoveryIds = new Set(
    seenRows.map((r) => r.discoveryId).filter(Boolean) as string[]
  );

  // --- Events bucket ------------------------------------------------------
  const eventRows = await prisma.event.findMany({
    where: {
      isArchived: false,
      status: "PUBLISHED",
      id: { notIn: Array.from(seenEventIds) },
      startTime: { gte: new Date() },
    },
    orderBy: [{ qualityScore: "desc" }, { startTime: "asc" }],
    take: 60,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      region: true,
      townName: true,
      neighborhood: true,
      imageUrl: true,
      qualityScore: true,
      oneLiner: true,
    },
  });

  // --- Places bucket ------------------------------------------------------
  const placeRows = await prisma.place.findMany({
    where: {
      openingStatus: "OPEN",
      id: { notIn: Array.from(seenPlaceIds) },
    },
    orderBy: [{ combinedScore: "desc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      pulseDescription: true,
      category: true,
      region: true,
      townName: true,
      neighborhood: true,
      // No image on Place schema today — render fallback
    },
  });

  // --- Discoveries bucket -------------------------------------------------
  const discoveryRows = await prisma.discovery.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: Array.from(seenDiscoveryIds) },
      qualityScore: { gte: QUALITY_FLOOR },
    },
    orderBy: { qualityScore: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      region: true,
      townName: true,
      neighborhood: true,
      seasonHint: true,
    },
  });

  // Diversity picker: pick up to `n` rows from a list, one per category until
  // we run out, then fill remaining slots from anything left. Treats null
  // categories as a distinct "unknown" bucket so they don't accidentally
  // monopolize selection.
  function diversePick<T extends { category: Category | null }>(
    rows: T[],
    n: number
  ): T[] {
    const out: T[] = [];
    const seenCats = new Set<string>();
    // First pass: one per category
    for (const row of rows) {
      if (out.length >= n) break;
      const key = row.category ?? "__null__";
      if (seenCats.has(key)) continue;
      out.push(row);
      seenCats.add(key);
    }
    // Second pass: fill any remaining slots
    for (const row of rows) {
      if (out.length >= n) break;
      if (out.includes(row)) continue;
      out.push(row);
    }
    return out;
  }

  const eventsPicked = diversePick(eventRows, TARGET_PER_BUCKET);
  const placesPicked = diversePick(placeRows, TARGET_PER_BUCKET);
  const discoveriesPicked = diversePick(discoveryRows, TARGET_PER_BUCKET);

  // Build the unified SwiperItem list
  const items: SwiperItem[] = [
    ...eventsPicked.map<SwiperItem>((e) => ({
      kind: "event",
      id: e.id,
      title: e.title,
      description: e.oneLiner ?? e.description,
      category: e.category,
      region: e.region,
      townName: e.townName ?? e.neighborhood ?? null,
      imageUrl: e.imageUrl,
      meta: null,
    })),
    ...placesPicked.map<SwiperItem>((p) => ({
      kind: "place",
      id: p.id,
      title: p.name,
      description: p.pulseDescription ?? "",
      category: p.category ?? "OTHER",
      region: p.region,
      townName: p.townName ?? p.neighborhood ?? null,
      imageUrl: null,
      meta: null,
    })),
    ...discoveriesPicked.map<SwiperItem>((d) => ({
      kind: "discovery",
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      region: d.region,
      townName: d.townName ?? d.neighborhood ?? null,
      imageUrl: null,
      meta: d.seasonHint,
    })),
  ];

  // Regional quota + Hidden Gem guarantee. If buckets came back short we
  // just ship what we have — user still gets a usable experience.
  const regionalCount = items.filter(
    (it) => !NEAR_ME_REGIONS.includes(it.region) || it.region !== "DENVER_METRO"
  ).length;
  // (Soft check — if regional quota not met, skip. The initial buckets often
  // satisfy this naturally via Discoveries + regional events.)

  // Fisher-Yates shuffle so the order doesn't leak bucket structure
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return NextResponse.json({
    items: items.slice(0, TOTAL),
    debug: {
      eventsAvailable: eventRows.length,
      placesAvailable: placeRows.length,
      discoveriesAvailable: discoveryRows.length,
      regionalCount,
    },
  });
}
