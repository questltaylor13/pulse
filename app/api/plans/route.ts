import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GoingWith, PlanType } from "@prisma/client";

const createPlanSchema = z.object({
  name: z.string().min(1),
  planType: z.enum(["DATE_NIGHT", "SOCIAL", "SOLO_CHILL", "FAMILY_FUN", "CUSTOM"]),
  goingWith: z.enum(["SOLO", "DATE", "FRIENDS", "FAMILY"]),
  dateStart: z.string().transform((s) => new Date(s)),
  dateEnd: z.string().transform((s) => new Date(s)),
  eventIds: z.array(z.string()).optional(),
});

// Get user's plans
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    where: { userId: session.user.id },
    include: {
      events: {
        orderBy: { order: "asc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              venueName: true,
              neighborhood: true,
              startTime: true,
              endTime: true,
              priceRange: true,
            },
          },
        },
      },
    },
    orderBy: { dateStart: "desc" },
  });

  return NextResponse.json({
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      planType: plan.planType,
      goingWith: plan.goingWith,
      dateStart: plan.dateStart,
      dateEnd: plan.dateEnd,
      totalCost: plan.totalCost,
      neighborhoods: plan.neighborhoods,
      isPublic: plan.isPublic,
      events: plan.events.map((pe) => ({
        id: pe.event.id,
        title: pe.event.title,
        category: pe.event.category,
        venueName: pe.event.venueName,
        neighborhood: pe.event.neighborhood,
        startTime: pe.event.startTime,
        endTime: pe.event.endTime,
        priceRange: pe.event.priceRange,
        order: pe.order,
        notes: pe.notes,
      })),
      createdAt: plan.createdAt,
    })),
  });
}

// Create a new plan
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createPlanSchema.parse(body);

    // Get events if provided
    let events: Array<{
      id: string;
      neighborhood: string | null;
      priceRange: string;
    }> = [];

    if (validated.eventIds?.length) {
      events = await prisma.event.findMany({
        where: { id: { in: validated.eventIds } },
        select: { id: true, neighborhood: true, priceRange: true },
      });
    }

    // Calculate total cost estimate
    let totalCost = "Free";
    if (events.length > 0) {
      const prices = events.map((e) => {
        const nums = e.priceRange.match(/\d+/g);
        return nums ? Math.max(...nums.map(Number)) : 0;
      });
      const total = prices.reduce((a, b) => a + b, 0);
      if (total === 0) totalCost = "Free";
      else if (total <= 50) totalCost = "Under $50";
      else if (total <= 100) totalCost = "Under $100";
      else totalCost = `Around $${total}`;
    }

    // Get unique neighborhoods
    const neighborhoods = [...new Set(events.map((e) => e.neighborhood).filter(Boolean))] as string[];

    // Create plan
    const plan = await prisma.plan.create({
      data: {
        userId: session.user.id,
        name: validated.name,
        planType: validated.planType as PlanType,
        goingWith: validated.goingWith as GoingWith,
        dateStart: validated.dateStart,
        dateEnd: validated.dateEnd,
        totalCost,
        neighborhoods,
        events: {
          create: validated.eventIds?.map((eventId, index) => ({
            eventId,
            order: index,
          })) || [],
        },
      },
      include: {
        events: {
          orderBy: { order: "asc" },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                category: true,
                venueName: true,
                startTime: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        planType: plan.planType,
        goingWith: plan.goingWith,
        dateStart: plan.dateStart,
        dateEnd: plan.dateEnd,
        totalCost: plan.totalCost,
        neighborhoods: plan.neighborhoods,
        events: plan.events.map((pe) => ({
          id: pe.event.id,
          title: pe.event.title,
          category: pe.event.category,
          venueName: pe.event.venueName,
          startTime: pe.event.startTime,
          order: pe.order,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Plan creation error:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
