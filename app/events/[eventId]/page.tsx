import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEventWithStatus, recordEventView } from "@/lib/actions/events";
import { getRecommendations } from "@/lib/recommendations";
import { getListItemsNearby, discoverNearby } from "@/lib/proximity";
import { DEFAULT_RADIUS_MILES } from "@/lib/geo";
import EventDetailClient from "./EventDetailClient";
import PeopleLikeYouAlsoLiked from "@/components/PeopleLikeYouAlsoLiked";
import NearbySection from "@/components/nearby/NearbySection";

interface PageProps {
  params: { eventId: string };
}

export default async function EventDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  // Require auth
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Check onboarding
  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  const { eventId } = params;

  // Fetch event
  const event = await getEventWithStatus(eventId);

  if (!event) {
    notFound();
  }

  // Record view (async, don't await)
  recordEventView(eventId);

  // Get recommendations + nearby data in parallel
  const hasCoords = event.place?.lat != null && event.place?.lng != null;
  const center = hasCoords
    ? { lat: event.place!.lat!, lng: event.place!.lng! }
    : null;

  const [recommendations, nearbyGroups, nearbyDiscovery] = await Promise.all([
    getRecommendations(session.user.id, eventId, 12),
    center
      ? getListItemsNearby(session.user.id, center, DEFAULT_RADIUS_MILES)
      : Promise.resolve([]),
    center
      ? discoverNearby(session.user.id, center, DEFAULT_RADIUS_MILES)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <EventDetailClient event={event} />

      {center && (
        <NearbySection
          lat={center.lat}
          lng={center.lng}
          initialListGroups={nearbyGroups}
          initialDiscoveryItems={nearbyDiscovery}
        />
      )}

      {recommendations.length > 0 && (
        <PeopleLikeYouAlsoLiked recommendations={recommendations} />
      )}
    </div>
  );
}
