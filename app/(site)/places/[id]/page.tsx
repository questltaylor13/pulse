import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { similarPlaces } from "@/lib/detail/similar";
import PlaceDetailPage from "@/components/detail/PlaceDetailPage";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    select: { name: true, neighborhood: true },
  });

  if (!place) return { title: "Place Not Found | Pulse" };

  return {
    title: `${place.name} | Pulse`,
    description: `Discover ${place.name}${place.neighborhood ? ` in ${place.neighborhood}` : ""} on Pulse`,
  };
}

export default async function PlacePage({ params }: PageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    include: {
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          startTime: true,
        },
      },
    },
  });

  if (!place) notFound();

  const similar = await similarPlaces(place.id, 3);

  return (
    <PlaceDetailPage
      place={{
        id: place.id,
        name: place.name,
        address: place.address,
        neighborhood: place.neighborhood,
        category: place.category,
        primaryImageUrl: place.primaryImageUrl,
        priceLevel: place.priceLevel,
        vibeTags: place.vibeTags,
        pulseDescription: place.pulseDescription,
        googleMapsUrl: place.googleMapsUrl,
        phoneNumber: place.phoneNumber,
        website: place.website,
        openingHours: place.openingHours,
        lat: place.lat,
        lng: place.lng,
      }}
      upcomingEvents={place.events}
      similarPlaces={similar}
    />
  );
}
