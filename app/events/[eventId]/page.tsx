import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEventWithStatus, recordEventView } from "@/lib/actions/events";
import { getRecommendations } from "@/lib/recommendations";
import EventDetailClient from "./EventDetailClient";
import PeopleLikeYouAlsoLiked from "@/components/PeopleLikeYouAlsoLiked";

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

  // Get recommendations
  const recommendations = await getRecommendations(session.user.id, eventId, 12);

  return (
    <div className="space-y-8">
      <EventDetailClient event={event} />

      {recommendations.length > 0 && (
        <PeopleLikeYouAlsoLiked recommendations={recommendations} />
      )}
    </div>
  );
}
