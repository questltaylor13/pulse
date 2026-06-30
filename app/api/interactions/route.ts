import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { InteractionStatus, ItemStatus, FeedbackSource } from "@prisma/client";
import { upsertFeedback, deleteFeedback } from "@/lib/feedback/api";

const interactionSchema = z
  .object({
    eventId: z.string().optional(),
    placeId: z.string().optional(),
    action: z.enum(["save", "unsave", "like", "unlike", "rate", "attend"]),
    rating: z.number().min(1).max(5).optional(),
  })
  .refine((d) => !!d.eventId !== !!d.placeId, {
    message: "Provide exactly one of eventId or placeId",
  });

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = interactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { eventId, placeId, action, rating } = parsed.data;
  const userId = session.user.id;
  const isPlace = !!placeId;
  const ref = isPlace ? { placeId: placeId! } : { eventId: eventId! };

  // Verify the target exists.
  const exists = isPlace
    ? await prisma.place.findUnique({ where: { id: placeId! }, select: { id: true } })
    : await prisma.event.findUnique({ where: { id: eventId! }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // like / unlike / rate / attend are event-only legacy actions.
  if (isPlace && action !== "save" && action !== "unsave") {
    return NextResponse.json(
      { error: `Action '${action}' is not supported for places` },
      { status: 400 }
    );
  }

  // The heart is the PRIMARY taste signal. Mirror save/unsave into
  // UserItemStatus WANT — the signal the ranking engine actually reads
  // (buildRankingContext) — in addition to the legacy UserEventInteraction
  // saved-list. Previously the heart trained nothing.
  if (action === "save") {
    await upsertFeedback({
      userId,
      ref,
      status: ItemStatus.WANT,
      source: FeedbackSource.FEED_CARD,
    }).catch((e) => console.warn("[interactions] WANT write failed:", e));
  } else if (action === "unsave") {
    // Retract WANT only — never clobber an explicit DONE/PASS the user set.
    const current = await prisma.userItemStatus
      .findUnique({
        where: isPlace
          ? { userId_placeId: { userId, placeId: placeId! } }
          : { userId_eventId: { userId, eventId: eventId! } },
        select: { status: true },
      })
      .catch(() => null);
    if (current?.status === ItemStatus.WANT) {
      await deleteFeedback({ userId, ref }).catch((e) =>
        console.warn("[interactions] WANT delete failed:", e)
      );
    }
  }

  // Places have no UserEventInteraction row (that model is event-keyed), so
  // the WANT write above is their store of record. (This also fixes place
  // saving, which previously 400'd on the missing eventId.)
  if (isPlace) {
    return NextResponse.json({ success: true });
  }

  // --- Events: maintain the legacy UserEventInteraction saved/liked/rating row ---
  let interaction = await prisma.userEventInteraction.findUnique({
    where: { userId_eventId: { userId, eventId: eventId! } },
  });

  switch (action) {
    case "save":
      interaction = await prisma.userEventInteraction.upsert({
        where: { userId_eventId: { userId, eventId: eventId! } },
        create: { userId, eventId: eventId!, status: InteractionStatus.SAVED },
        update: { status: InteractionStatus.SAVED },
      });
      break;

    case "unsave":
      if (interaction) {
        await prisma.userEventInteraction.delete({ where: { id: interaction.id } });
        return NextResponse.json({ success: true, interaction: null });
      }
      break;

    case "like":
      interaction = await prisma.userEventInteraction.upsert({
        where: { userId_eventId: { userId, eventId: eventId! } },
        create: {
          userId,
          eventId: eventId!,
          status: InteractionStatus.SAVED,
          liked: true,
        },
        update: { liked: true },
      });
      break;

    case "unlike":
      if (interaction) {
        interaction = await prisma.userEventInteraction.update({
          where: { id: interaction.id },
          data: { liked: false },
        });
      }
      break;

    case "rate":
      if (!rating) {
        return NextResponse.json(
          { error: "Rating required for rate action" },
          { status: 400 }
        );
      }
      interaction = await prisma.userEventInteraction.upsert({
        where: { userId_eventId: { userId, eventId: eventId! } },
        create: {
          userId,
          eventId: eventId!,
          status: InteractionStatus.ATTENDED,
          rating,
        },
        update: { status: InteractionStatus.ATTENDED, rating },
      });
      break;

    case "attend":
      interaction = await prisma.userEventInteraction.upsert({
        where: { userId_eventId: { userId, eventId: eventId! } },
        create: { userId, eventId: eventId!, status: InteractionStatus.ATTENDED },
        update: { status: InteractionStatus.ATTENDED },
      });
      break;
  }

  return NextResponse.json({ success: true, interaction });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("eventId");
  const status = searchParams.get("status") as InteractionStatus | null;

  const userId = session.user.id;

  // If eventId provided, return single interaction
  if (eventId) {
    const interaction = await prisma.userEventInteraction.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });
    return NextResponse.json({ interaction });
  }

  // Otherwise return all user interactions
  const whereClause = {
    userId,
    ...(status && { status }),
  };

  const interactions = await prisma.userEventInteraction.findMany({
    where: whereClause,
    include: {
      event: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interactions });
}
