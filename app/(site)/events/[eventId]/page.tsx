import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { similarEvents } from "@/lib/detail/similar";
import EventDetailPage from "@/components/detail/EventDetailPage";

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

  return (
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
  );
}
