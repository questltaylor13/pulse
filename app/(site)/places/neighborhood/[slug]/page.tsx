import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlaceCompact } from "@/lib/home/types";
import NeighborhoodDetailPage from "@/components/places/NeighborhoodDetailPage";

interface Props {
  params: { slug: string };
  searchParams: { cat?: string };
}

const CAT_FILTER: Record<string, Category[]> = {
  eat: ["FOOD", "RESTAURANT"],
  drink: ["BARS"],
  coffee: ["COFFEE"],
  "things-to-do": ["OUTDOORS", "ACTIVITY_VENUE", "ART", "LIVE_MUSIC", "COMEDY"],
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const neighborhood = await prisma.neighborhood.findUnique({
    where: { slug: params.slug },
  });
  if (!neighborhood) return { title: "Neighborhood Not Found" };
  return {
    title: `${neighborhood.name} — Denver neighborhoods | Pulse`,
    description: neighborhood.description.slice(0, 160),
  };
}

export default async function NeighborhoodPage({ params, searchParams }: Props) {
  const neighborhood = await prisma.neighborhood.findUnique({
    where: { slug: params.slug },
  });

  if (!neighborhood) notFound();

  const activeCat = searchParams.cat ?? "all";
  const categoryFilter = CAT_FILTER[activeCat];

  const places = await prisma.place.findMany({
    where: {
      neighborhood: { equals: neighborhood.name, mode: "insensitive" },
      openingStatus: "OPEN",
      ...(categoryFilter ? { category: { in: categoryFilter } } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { combinedScore: "desc" }],
    take: 60,
  });

  const compact: PlaceCompact[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    imageUrl: p.primaryImageUrl,
    neighborhood: p.neighborhood,
    address: p.address ?? "",
    priceLevel: p.priceLevel,
    vibeTags: p.vibeTags,
    tags: p.tags,
    openedDate: p.openedDate?.toISOString() ?? null,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    region: p.region,
    townName: p.townName,
    isDayTrip: p.isDayTrip,
    isWeekendTrip: p.isWeekendTrip,
    driveTimeFromDenver: p.driveTimeFromDenver,
    driveNote: p.driveNote,
  }));

  return (
    <NeighborhoodDetailPage
      neighborhood={{
        name: neighborhood.name,
        slug: neighborhood.slug,
        description: neighborhood.description,
        placeCount: neighborhood.placeCount,
      }}
      places={compact}
      activeCat={activeCat}
    />
  );
}
