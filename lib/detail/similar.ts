import prisma from "@/lib/prisma";
import { activeEventsWhere } from "@/lib/queries/events";

export async function similarEvents(eventId: string, limit = 3) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { category: true, neighborhood: true },
  });
  if (!event) return [];

  let results = await prisma.event.findMany({
    where: {
      ...activeEventsWhere(),
      id: { not: eventId },
      category: event.category,
      ...(event.neighborhood ? { neighborhood: event.neighborhood } : {}),
    },
    select: { id: true, title: true, imageUrl: true, category: true, startTime: true, venueName: true },
    take: limit,
    orderBy: { startTime: "asc" },
  });

  if (results.length < limit) {
    const ids = results.map((r) => r.id);
    const more = await prisma.event.findMany({
      where: {
        ...activeEventsWhere(),
        id: { notIn: [eventId, ...ids] },
        category: event.category,
      },
      select: { id: true, title: true, imageUrl: true, category: true, startTime: true, venueName: true },
      take: limit - results.length,
      orderBy: { startTime: "asc" },
    });
    results = [...results, ...more];
  }

  return results;
}

export async function similarPlaces(placeId: string, limit = 3) {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { category: true, neighborhood: true },
  });
  if (!place) return [];

  let results = await prisma.place.findMany({
    where: {
      id: { not: placeId },
      openingStatus: "OPEN",
      category: place.category,
      ...(place.neighborhood ? { neighborhood: place.neighborhood } : {}),
    },
    select: { id: true, name: true, primaryImageUrl: true, category: true, neighborhood: true, vibeTags: true },
    take: limit,
    orderBy: { googleRating: "desc" },
  });

  if (results.length < limit) {
    const ids = results.map((r) => r.id);
    const more = await prisma.place.findMany({
      where: {
        id: { notIn: [placeId, ...ids] },
        openingStatus: "OPEN",
        category: place.category,
      },
      select: { id: true, name: true, primaryImageUrl: true, category: true, neighborhood: true, vibeTags: true },
      take: limit - results.length,
      orderBy: { googleRating: "desc" },
    });
    results = [...results, ...more];
  }

  return results;
}
