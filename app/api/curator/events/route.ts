import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category, EventStatus } from "@prisma/client";

// GET /api/curator/events - List creator's events
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const influencer = await prisma.influencer.findFirst({
    where: { userId: session.user.id },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Not a creator" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") as EventStatus | null;
  const tab = searchParams.get("tab"); // all, upcoming, past, drafts

  const now = new Date();
  let whereClause: Record<string, unknown> = { createdById: influencer.id };

  if (tab === "upcoming") {
    whereClause.startTime = { gte: now };
    whereClause.status = "PUBLISHED";
  } else if (tab === "past") {
    whereClause.startTime = { lt: now };
    whereClause.status = "PUBLISHED";
  } else if (tab === "drafts") {
    whereClause.status = "DRAFT";
  } else if (status) {
    whereClause.status = status;
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    orderBy: { startTime: "desc" },
    include: {
      place: { select: { name: true, neighborhood: true } },
      _count: {
        select: {
          userStatuses: { where: { status: "WANT" } },
        },
      },
      creatorFeatures: {
        where: { influencerId: influencer.id },
        select: { isHost: true, quote: true, isFeatured: true },
      },
    },
  });

  const formatted = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    venueName: e.venueName,
    neighborhood: e.neighborhood || e.place?.neighborhood,
    startTime: e.startTime,
    endTime: e.endTime,
    priceRange: e.priceRange,
    status: e.status,
    coverImage: e.coverImage || e.imageUrl,
    saves: e._count.userStatuses,
    isHost: e.creatorFeatures[0]?.isHost || false,
    quote: e.creatorFeatures[0]?.quote,
    isFeatured: e.creatorFeatures[0]?.isFeatured || false,
  }));

  return NextResponse.json({ events: formatted });
}

// POST /api/curator/events - Create new event
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const influencer = await prisma.influencer.findFirst({
    where: { userId: session.user.id },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Not a creator" }, { status: 403 });
  }

  const data = await request.json();

  // Validate required fields
  if (!data.title || !data.description || !data.category || !data.startTime || !data.venueName || !data.address || !data.neighborhood) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get Denver city
  const city = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 500 });
  }

  // Create the event
  const event = await prisma.event.create({
    data: {
      cityId: city.id,
      title: data.title,
      description: data.description,
      category: data.category as Category,
      tags: data.tags || [],
      venueName: data.venueName,
      address: data.address,
      neighborhood: data.neighborhood,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : null,
      priceRange: data.priceRange || "Varies",
      source: "curator",
      sourceUrl: data.sourceUrl || null,
      coverImage: data.coverImage || null,
      images: data.images || [],
      imageUrl: data.coverImage || null, // Legacy field
      ticketUrl: data.ticketUrl || null,
      ticketInfo: data.ticketInfo || null,
      vibeTags: data.vibeTags || [],
      companionTags: data.companionTags || [],
      occasionTags: data.occasionTags || [],
      placeId: data.placeId || null,
      createdById: influencer.id,
      status: data.isDraft ? "DRAFT" : "PUBLISHED",
      publishedAt: data.isDraft ? null : new Date(),
    },
  });

  // Create CreatorEventFeature for attribution
  await prisma.creatorEventFeature.create({
    data: {
      influencerId: influencer.id,
      eventId: event.id,
      quote: data.quote || null,
      isHost: data.isHost || false,
      isFeatured: data.isFeatured || false,
    },
  });

  // Add social content if provided
  if (data.socialVideos && data.socialVideos.length > 0) {
    await prisma.eventSocialContent.createMany({
      data: data.socialVideos.map((video: { platform: string; url: string; thumbnail?: string; authorHandle?: string; caption?: string }, index: number) => ({
        eventId: event.id,
        platform: video.platform,
        url: video.url,
        thumbnail: video.thumbnail || null,
        authorHandle: video.authorHandle || null,
        caption: video.caption || null,
        order: index,
      })),
    });
  }

  return NextResponse.json({ event, success: true });
}
