import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import DiscoveryCard from "@/components/DiscoveryCard";
import HiddenGemsFilters from "@/components/HiddenGemsFilters";
import type {
  Category,
  DiscoverySubtype,
  EventRegion,
  Prisma,
} from "@prisma/client";

// PRD 3 Phase 5 — Hidden Gems tab.
// Top-level destination for curated Discoveries. Filter chips drive the
// URL so deep-linking + back-button work naturally.

const NEAR_ME_REGIONS: EventRegion[] = [
  "DENVER_METRO",
  "FRONT_RANGE",
  "MOUNTAIN_GATEWAY",
];

interface PageProps {
  searchParams: Promise<{
    subtype?: string;
    scope?: string;
    category?: string;
  }>;
}

function normalizeSubtype(s: string | undefined): DiscoverySubtype | null {
  if (!s) return null;
  if (s === "HIDDEN_GEM" || s === "NICHE_ACTIVITY" || s === "SEASONAL_TIP") return s;
  return null;
}

async function DiscoveryList({
  subtype,
  scope,
  category,
}: {
  subtype: DiscoverySubtype | null;
  scope: string;
  category: string | undefined;
}) {
  const where: Prisma.DiscoveryWhereInput = { status: "ACTIVE" };
  if (subtype) where.subtype = subtype;
  if (scope === "near_me") where.region = { in: NEAR_ME_REGIONS };
  if (category) where.category = category as Category;

  const gems = await prisma.discovery.findMany({
    where,
    orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    take: 48,
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
      qualityScore: true,
      tags: true,
    },
  });

  if (gems.length === 0) {
    const hint =
      scope === "near_me"
        ? "Not seeing much nearby? Try All of Colorado to pick up mountain-town picks."
        : "No discoveries match this filter yet — the weekly refresh is how this grows.";
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-slate-900">Nothing here yet</h3>
        <p className="mt-1 text-sm text-slate-600">{hint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {gems.map((gem) => (
        <DiscoveryCard key={gem.id} gem={gem} />
      ))}
    </div>
  );
}

export default async function DiscoveriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const subtype = normalizeSubtype(params.subtype);
  const scope = params.scope ?? "near_me";
  const category = params.category;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
            ✦ Curated
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Hidden Gems
        </h1>
        <p className="max-w-2xl text-slate-600">
          Spots, rec leagues, and seasonal rituals the guidebooks miss.
          Refreshed weekly from local sources — rewritten in Pulse voice.
        </p>
      </header>

      <Suspense fallback={null}>
        <HiddenGemsFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        }
      >
        <DiscoveryList subtype={subtype} scope={scope} category={category} />
      </Suspense>
    </div>
  );
}
