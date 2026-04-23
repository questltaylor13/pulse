import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { similarPlaces } from "@/lib/detail/similar";
import PlaceDetailPage from "@/components/detail/PlaceDetailPage";
import DetailFeedback from "@/components/feedback/DetailFeedback";
import { getFeedbackMaps } from "@/lib/feedback/server";

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

  // PRD 5 Phase 3 — fetch user's current feedback on this place.
  const session = await getServerSession(authOptions);
  const { byPlaceId } = await getFeedbackMaps({
    userId: session?.user?.id,
    placeIds: [place.id],
  });
  const feedbackStatus = byPlaceId.get(place.id) ?? null;

  return (
    <>
      <div className="mx-auto flex max-w-3xl justify-end px-5 pt-3">
        <DetailFeedback
          ref_={{ placeId: place.id }}
          itemTitle={place.name}
          shareUrl={`/places/${place.id}`}
          initialStatus={feedbackStatus}
        />
      </div>
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
    </>
  );
}
