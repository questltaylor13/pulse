import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

// GET /api/curator/events/[id] - Get single event for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      place: true,
      creatorFeatures: {
        where: { influencerId: influencer.id },
      },
      socialContent: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Check if this creator owns the event
  if (event.createdById !== influencer.id) {
    return NextResponse.json({ error: "Not authorized to edit this event" }, { status: 403 });
  }

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      venueName: event.venueName,
      address: event.address,
      neighborhood: event.neighborhood,
      startTime: event.startTime,
      endTime: event.endTime,
      priceRange: event.priceRange,
      status: event.status,
      coverImage: event.coverImage,
      images: event.images,
      ticketUrl: event.ticketUrl,
      ticketInfo: event.ticketInfo,
      vibeTags: event.vibeTags,
      companionTags: event.companionTags,
      placeId: event.placeId,
      place: event.place,
      isHost: event.creatorFeatures[0]?.isHost || false,
      quote: event.creatorFeatures[0]?.quote || "",
      isFeatured: event.creatorFeatures[0]?.isFeatured || false,
      socialVideos: event.socialContent.map((sc) => ({
        id: sc.id,
        platform: sc.platform,
        url: sc.url,
        thumbnail: sc.thumbnail,
        authorHandle: sc.authorHandle,
        caption: sc.caption,
      })),
    },
  });
}

// PUT /api/curator/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const data = await request.json();

  // Check ownership
  const existingEvent = await prisma.event.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!existingEvent || existingEvent.createdById !== influencer.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Update event
  const event = await prisma.event.update({
    where: { id },
    data: {
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
      coverImage: data.coverImage || null,
      images: data.images || [],
      imageUrl: data.coverImage || null,
      ticketUrl: data.ticketUrl || null,
      ticketInfo: data.ticketInfo || null,
      vibeTags: data.vibeTags || [],
      companionTags: data.companionTags || [],
      placeId: data.placeId || null,
    },
  });

  // Update CreatorEventFeature
  await prisma.creatorEventFeature.upsert({
    where: {
      influencerId_eventId: {
        influencerId: influencer.id,
        eventId: id,
      },
    },
    update: {
      quote: data.quote || null,
      isHost: data.isHost || false,
      isFeatured: data.isFeatured || false,
    },
    create: {
      influencerId: influencer.id,
      eventId: id,
      quote: data.quote || null,
      isHost: data.isHost || false,
      isFeatured: data.isFeatured || false,
    },
  });

  // Update social content - delete all and recreate
  await prisma.eventSocialContent.deleteMany({
    where: { eventId: id },
  });

  if (data.socialVideos && data.socialVideos.length > 0) {
    await prisma.eventSocialContent.createMany({
      data: data.socialVideos.map((video: { platform: string; url: string; thumbnail?: string; authorHandle?: string; caption?: string }, index: number) => ({
        eventId: id,
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

// DELETE /api/curator/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // Check ownership
  const existingEvent = await prisma.event.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!existingEvent || existingEvent.createdById !== influencer.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete event (cascades to related records)
  await prisma.event.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
