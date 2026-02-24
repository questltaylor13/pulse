/**
 * Proximity query engine for nearby list items and discovery.
 */

import { prisma } from "@/lib/prisma";
import { haversineDistance, boundingBox, milesToMeters, type LatLng } from "@/lib/geo";
import { searchNearbyPlaces, type PlaceSearchResult } from "@/lib/google-places";
import type { Category } from "@prisma/client";

// ---- Types ----

export interface NearbyListItem {
  id: string;
  listItemId: string;
  type: "event" | "place";
  name: string;
  address: string;
  neighborhood: string | null;
  category: Category | null;
  priceLevel: number | null;
  priceRange: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  imageUrl: string | null;
  distance: number; // miles
  notes: string | null;
  vibeTags: string[];
  isNew: boolean;
  // Link target
  eventId: string | null;
  placeId: string | null;
}

export interface NearbyListGroup {
  listId: string;
  listName: string;
  isOwner: boolean;
  ownerName: string | null;
  items: NearbyListItem[];
}

export interface NearbyDiscoveryItem {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number; // miles
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  types: string[];
  // Pulse enrichment (if we have this place in our DB)
  pulseId: string | null;
  isNew: boolean;
  vibeTags: string[];
  category: Category | null;
  neighborhood: string | null;
}

// ---- Nearby List Items ----

export async function getListItemsNearby(
  userId: string,
  center: LatLng,
  radiusMiles: number
): Promise<NearbyListGroup[]> {
  const bbox = boundingBox(center, radiusMiles);

  // Get all list IDs where user is owner OR collaborator
  const [ownedLists, collaborations] = await Promise.all([
    prisma.list.findMany({
      where: { userId },
      select: { id: true, name: true, userId: true },
    }),
    prisma.listCollaborator.findMany({
      where: { userId },
      select: {
        list: { select: { id: true, name: true, userId: true } },
      },
    }),
  ]);

  const allLists = [
    ...ownedLists.map((l) => ({ ...l, isOwner: true })),
    ...collaborations.map((c) => ({ ...c.list, isOwner: false })),
  ];

  if (allLists.length === 0) return [];

  const listIds = allLists.map((l) => l.id);

  // Query ListItems with placeId in bounding box (direct place references)
  const placeItems = await prisma.listItem.findMany({
    where: {
      listId: { in: listIds },
      placeId: { not: null },
      place: {
        lat: { gte: bbox.minLat, lte: bbox.maxLat },
        lng: { gte: bbox.minLng, lte: bbox.maxLng },
      },
    },
    include: {
      place: {
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          neighborhood: true,
          category: true,
          priceLevel: true,
          googleRating: true,
          googleReviewCount: true,
          primaryImageUrl: true,
          vibeTags: true,
          isNew: true,
        },
      },
    },
  });

  // Query ListItems with eventId where Event.place is in bounding box
  const eventItems = await prisma.listItem.findMany({
    where: {
      listId: { in: listIds },
      eventId: { not: null },
      event: {
        place: {
          lat: { gte: bbox.minLat, lte: bbox.maxLat },
          lng: { gte: bbox.minLng, lte: bbox.maxLng },
        },
      },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          address: true,
          neighborhood: true,
          category: true,
          priceRange: true,
          googleRating: true,
          googleRatingCount: true,
          imageUrl: true,
          place: {
            select: {
              lat: true,
              lng: true,
              vibeTags: true,
              isNew: true,
            },
          },
        },
      },
    },
  });

  // Get owner names for shared lists
  const ownerIds = allLists.filter((l) => !l.isOwner).map((l) => l.userId);
  const owners =
    ownerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, username: true },
        })
      : [];
  const ownerMap = new Map(owners.map((o) => [o.id, o.name || o.username || "Unknown"]));

  // Build items with haversine post-filter
  const listMap = new Map(allLists.map((l) => [l.id, l]));
  const groupsMap = new Map<string, NearbyListGroup>();

  const addToGroup = (listId: string, item: NearbyListItem) => {
    const listInfo = listMap.get(listId);
    if (!listInfo) return;

    if (!groupsMap.has(listId)) {
      groupsMap.set(listId, {
        listId,
        listName: listInfo.name,
        isOwner: listInfo.isOwner,
        ownerName: listInfo.isOwner ? null : ownerMap.get(listInfo.userId) || null,
        items: [],
      });
    }
    groupsMap.get(listId)!.items.push(item);
  };

  // Process place-based items
  for (const item of placeItems) {
    if (!item.place?.lat || !item.place?.lng) continue;
    const dist = haversineDistance(center, { lat: item.place.lat, lng: item.place.lng });
    if (dist > radiusMiles) continue;

    addToGroup(item.listId, {
      id: item.place.id,
      listItemId: item.id,
      type: "place",
      name: item.place.name,
      address: item.place.address,
      neighborhood: item.place.neighborhood,
      category: item.place.category,
      priceLevel: item.place.priceLevel,
      priceRange: null,
      googleRating: item.place.googleRating,
      googleReviewCount: item.place.googleReviewCount,
      imageUrl: item.place.primaryImageUrl,
      distance: dist,
      notes: item.notes,
      vibeTags: item.place.vibeTags,
      isNew: item.place.isNew,
      eventId: null,
      placeId: item.place.id,
    });
  }

  // Process event-based items
  for (const item of eventItems) {
    if (!item.event?.place?.lat || !item.event?.place?.lng) continue;
    const dist = haversineDistance(center, {
      lat: item.event.place.lat,
      lng: item.event.place.lng,
    });
    if (dist > radiusMiles) continue;

    addToGroup(item.listId, {
      id: item.event.id,
      listItemId: item.id,
      type: "event",
      name: item.event.title,
      address: item.event.address,
      neighborhood: item.event.neighborhood,
      category: item.event.category,
      priceLevel: null,
      priceRange: item.event.priceRange,
      googleRating: item.event.googleRating,
      googleReviewCount: item.event.googleRatingCount,
      imageUrl: item.event.imageUrl,
      distance: dist,
      notes: item.notes,
      vibeTags: item.event.place.vibeTags || [],
      isNew: item.event.place.isNew || false,
      eventId: item.event.id,
      placeId: null,
    });
  }

  // Sort items by distance within each group
  const groups = Array.from(groupsMap.values());
  for (const group of groups) {
    group.items.sort((a, b) => a.distance - b.distance);
  }

  return groups;
}

// ---- Discovery ----

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function discoverNearby(
  userId: string,
  center: LatLng,
  radiusMiles: number,
  placeType?: string
): Promise<NearbyDiscoveryItem[]> {
  // Round coords to 3 decimal places for cache key stability (~100m precision)
  const roundedLat = Math.round(center.lat * 1000) / 1000;
  const roundedLng = Math.round(center.lng * 1000) / 1000;
  const cacheKey = `nearby:${roundedLat},${roundedLng}:${radiusMiles}:${placeType || "all"}`;

  // Check cache
  const cached = await prisma.googlePlacesCache.findUnique({
    where: { cacheKey },
  });

  let results: PlaceSearchResult[];

  if (cached && cached.expiresAt > new Date()) {
    results = JSON.parse(cached.resultsJson);
  } else {
    // Search Google Places
    const type = placeType || "restaurant";
    results = await searchNearbyPlaces(type, {
      location: center,
      radius: milesToMeters(radiusMiles),
    });

    // Cache results
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    await prisma.googlePlacesCache.upsert({
      where: { cacheKey },
      update: { resultsJson: JSON.stringify(results), expiresAt },
      create: { cacheKey, resultsJson: JSON.stringify(results), expiresAt },
    });
  }

  // Get user's saved placeIds to exclude
  const [savedListItems, savedStatuses] = await Promise.all([
    prisma.listItem.findMany({
      where: {
        list: {
          OR: [{ userId }, { collaborators: { some: { userId } } }],
        },
        placeId: { not: null },
      },
      select: { place: { select: { googlePlaceId: true } } },
    }),
    prisma.eventUserStatus.findMany({
      where: { userId },
      select: {
        event: { select: { place: { select: { googlePlaceId: true } } } },
      },
    }),
  ]);

  const savedGoogleIds = new Set<string>();
  for (const item of savedListItems) {
    if (item.place?.googlePlaceId) savedGoogleIds.add(item.place.googlePlaceId);
  }
  for (const status of savedStatuses) {
    if (status.event?.place?.googlePlaceId)
      savedGoogleIds.add(status.event.place.googlePlaceId);
  }

  // Cross-reference with our Place table for enrichment
  const googlePlaceIds = results.map((r) => r.placeId).filter(Boolean);
  const knownPlaces =
    googlePlaceIds.length > 0
      ? await prisma.place.findMany({
          where: { googlePlaceId: { in: googlePlaceIds } },
          select: {
            id: true,
            googlePlaceId: true,
            isNew: true,
            vibeTags: true,
            category: true,
            neighborhood: true,
          },
        })
      : [];
  const placeMap = new Map(knownPlaces.map((p) => [p.googlePlaceId, p]));

  // Filter out saved places, compute distance, build response
  const items: NearbyDiscoveryItem[] = [];
  for (const result of results) {
    if (savedGoogleIds.has(result.placeId)) continue;

    const dist = haversineDistance(center, { lat: result.lat, lng: result.lng });
    if (dist > radiusMiles) continue;

    const enrichment = placeMap.get(result.placeId);

    items.push({
      googlePlaceId: result.placeId,
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng,
      distance: dist,
      rating: result.rating ?? null,
      userRatingsTotal: result.userRatingsTotal ?? null,
      priceLevel: result.priceLevel ?? null,
      types: result.types,
      pulseId: enrichment?.id ?? null,
      isNew: enrichment?.isNew ?? false,
      vibeTags: enrichment?.vibeTags ?? [],
      category: enrichment?.category ?? null,
      neighborhood: enrichment?.neighborhood ?? null,
    });
  }

  items.sort((a, b) => a.distance - b.distance);
  return items;
}
