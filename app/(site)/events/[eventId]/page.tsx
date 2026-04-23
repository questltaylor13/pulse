import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { similarEvents } from "@/lib/detail/similar";
import EventDetailPage from "@/components/detail/EventDetailPage";
import DetailFeedback from "@/components/feedback/DetailFeedback";
import { getFeedbackMaps } from "@/lib/feedback/server";

interface PageProps {
  params: { eventId: string };
}

export async function generateMetadata({ params }: PageProps) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { title: true, venueName: true },
  });

  if (!event) return { title: "Event Not Found | Pulse" };

  return {
    title: `${event.title} | Pulse`,
    description: `${event.title} at ${event.venueName} on Pulse`,
  };
}

export default async function EventPage({ params }: PageProps) {
  const { eventId } = params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      place: {
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
        },
      },
    },
  });

  if (!event) notFound();

  const similar = await similarEvents(eventId, 3);

  // PRD 5 Phase 3 — fetch user's current feedback on this event so the
  // detail page can render the pill + ⋯ menu with the correct initial state.
  const session = await getServerSession(authOptions);
  const { byEventId } = await getFeedbackMaps({
    userId: session?.user?.id,
    eventIds: [eventId],
  });
  const feedbackStatus = byEventId.get(eventId) ?? null;

  return (
    <>
      <div className="mx-auto flex max-w-3xl justify-end px-5 pt-3">
        <DetailFeedback
          ref_={{ eventId }}
          itemTitle={event.title}
          shareUrl={`/events/${eventId}`}
          initialStatus={feedbackStatus}
        />
      </div>
      <EventDetailPage
      event={{
        id: event.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        category: event.category,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString() ?? null,
        venueName: event.venueName,
        address: event.address,
        neighborhood: event.neighborhood,
        priceRange: event.priceRange,
        ticketUrl: event.ticketUrl,
        sourceUrl: event.sourceUrl,
        vibeTags: event.vibeTags,
        tags: event.tags,
        oneLiner: event.oneLiner,
        place: event.place,
      }}
      similarEvents={similar}
    />
    </>
  );
}
