import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { slug: string };
}

// Get a public list by share slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  const list = await prisma.list.findUnique({
    where: { shareSlug: slug },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          profileImageUrl: true,
          isInfluencer: true,
        },
      },
      items: {
        orderBy: { order: "asc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              tags: true,
              venueName: true,
              address: true,
              neighborhood: true,
              startTime: true,
              endTime: true,
              priceRange: true,
              source: true,
              sourceUrl: true,
              googleRating: true,
              googleRatingCount: true,
              appleRating: true,
              appleRatingCount: true,
              place: {
                select: {
                  id: true,
                  googlePlaceId: true,
                  googleRating: true,
                  googleReviewCount: true,
                  priceLevel: true,
                  combinedScore: true,
                },
              },
            },
          },
          place: {
            select: {
              id: true,
              name: true,
              address: true,
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
      },
    },
  });

  if (!list || !list.isPublic) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Check if current user is the owner
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === list.userId;

  // Increment view count for non-owners
  if (!isOwner) {
    await prisma.list.update({
      where: { id: list.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Calculate summary statistics
  const allItems = list.items.filter((item) => item.event != null || item.place != null);
  const neighborhoods = [...new Set(
    allItems.map((item) => item.event?.neighborhood || item.place?.neighborhood).filter(Boolean)
  )];
  const freeCount = allItems.filter((item) =>
    item.event?.priceRange?.toLowerCase() === "free" || item.event?.priceRange === "$0"
  ).length;

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    coverImageUrl: list.coverImageUrl,
    template: list.template,
    shareSlug: list.shareSlug,
    viewCount: list.viewCount + (isOwner ? 0 : 1),
    saveCount: list.saveCount,
    isOwner,
    creator: {
      id: list.user.id,
      username: list.user.username,
      name: list.user.name,
      profileImageUrl: list.user.profileImageUrl,
      isInfluencer: list.user.isInfluencer,
    },
    items: allItems.map((item, index) => {
      if (item.place && !item.event) {
        return {
          id: item.place.id,
          listItemId: item.id,
          type: "place" as const,
          order: item.order || index,
          notes: item.notes,
          title: item.place.name,
          description: null,
          category: item.place.category,
          tags: item.place.vibeTags || [],
          venueName: item.place.name,
          address: item.place.address,
          neighborhood: item.place.neighborhood,
          startTime: null,
          endTime: null,
          priceRange: null,
          source: null,
          sourceUrl: null,
          googleRating: item.place.googleRating,
          googleRatingCount: item.place.googleReviewCount,
          appleRating: null,
          appleRatingCount: null,
          place: null,
          imageUrl: item.place.primaryImageUrl,
          addedAt: item.createdAt,
        };
      }
      return {
        id: item.event!.id,
        listItemId: item.id,
        type: "event" as const,
        order: item.order || index,
        notes: item.notes,
        title: item.event!.title,
        description: item.event!.description,
        category: item.event!.category,
        tags: item.event!.tags,
        venueName: item.event!.venueName,
        address: item.event!.address,
        neighborhood: item.event!.neighborhood,
        startTime: item.event!.startTime,
        endTime: item.event!.endTime,
        priceRange: item.event!.priceRange,
        source: item.event!.source,
        sourceUrl: item.event!.sourceUrl,
        googleRating: item.event!.googleRating,
        googleRatingCount: item.event!.googleRatingCount,
        appleRating: item.event!.appleRating,
        appleRatingCount: item.event!.appleRatingCount,
        place: item.event!.place,
        imageUrl: null,
        addedAt: item.createdAt,
      };
    }),
    summary: {
      itemCount: list.items.length,
      neighborhoods,
      freeCount,
    },
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  });
}
