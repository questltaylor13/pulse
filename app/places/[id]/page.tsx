import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListItemsNearby, discoverNearby } from "@/lib/proximity";
import { DEFAULT_RADIUS_MILES } from "@/lib/geo";
import PlaceDetailClient from "./PlaceDetailClient";
import NearbySection from "@/components/nearby/NearbySection";

interface PlaceDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PlaceDetailPageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    select: { name: true, neighborhood: true },
  });

  if (!place) {
    return { title: "Place Not Found | Pulse" };
  }

  return {
    title: `${place.name} | Pulse`,
    description: `Discover ${place.name}${place.neighborhood ? ` in ${place.neighborhood}` : ""} on Pulse`,
  };
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  // Get place from Place model
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    include: {
      events: {
        where: {
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      },
    },
  });

  if (!place) {
    notFound();
  }

  // Check if user has notification set
  const userAlert = await prisma.newPlaceAlert.findFirst({
    where: {
      userId: session.user.id,
      placeId: place.id,
    },
  });

  const hasCoords = place.lat != null && place.lng != null;
  const center = hasCoords ? { lat: place.lat!, lng: place.lng! } : null;

  // Get similar places + nearby data in parallel
  const [similarPlaces, nearbyGroups, nearbyDiscovery] = await Promise.all([
    prisma.place.findMany({
      where: {
        id: { not: place.id },
        category: place.category,
        openingStatus: "OPEN",
      },
      take: 6,
      orderBy: { googleRating: "desc" },
    }),
    center
      ? getListItemsNearby(session.user.id, center, DEFAULT_RADIUS_MILES)
      : Promise.resolve([]),
    center
      ? discoverNearby(session.user.id, center, DEFAULT_RADIUS_MILES)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <PlaceDetailClient
        place={place}
        hasNotification={!!userAlert}
        userId={session.user.id}
        similarPlaces={similarPlaces}
      />

      {center && (
        <NearbySection
          lat={center.lat}
          lng={center.lng}
          initialListGroups={nearbyGroups}
          initialDiscoveryItems={nearbyDiscovery}
        />
      )}
    </div>
  );
}
