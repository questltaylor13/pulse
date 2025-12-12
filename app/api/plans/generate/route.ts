import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Category, GoingWith, PlanType } from "@prisma/client";

const generatePlanSchema = z.object({
  goingWith: z.enum(["SOLO", "DATE", "FRIENDS", "FAMILY"]),
  dateStart: z.string().transform((s) => new Date(s)),
  dateEnd: z.string().transform((s) => new Date(s)),
  planType: z.enum(["DATE_NIGHT", "SOCIAL", "SOLO_CHILL", "FAMILY_FUN", "CUSTOM"]).optional(),
});

// Category preferences by plan type
const PLAN_TYPE_CATEGORIES: Record<PlanType, Category[]> = {
  DATE_NIGHT: ["FOOD", "RESTAURANT", "ART", "LIVE_MUSIC", "BARS", "SEASONAL"],
  SOCIAL: ["BARS", "LIVE_MUSIC", "FOOD", "POPUP", "OUTDOORS"],
  SOLO_CHILL: ["COFFEE", "ART", "OUTDOORS", "FITNESS"],
  FAMILY_FUN: ["ART", "OUTDOORS", "SEASONAL", "ACTIVITY_VENUE", "FOOD"],
  CUSTOM: [],
};

const GOING_WITH_CATEGORIES: Record<GoingWith, Category[]> = {
  DATE: ["FOOD", "RESTAURANT", "ART", "LIVE_MUSIC", "BARS", "SEASONAL"],
  FRIENDS: ["BARS", "LIVE_MUSIC", "FOOD", "POPUP", "OUTDOORS", "FITNESS"],
  FAMILY: ["ART", "OUTDOORS", "SEASONAL", "ACTIVITY_VENUE", "FOOD"],
  SOLO: ["COFFEE", "ART", "OUTDOORS", "FITNESS"],
};

// Generate plan suggestions
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = generatePlanSchema.parse(body);

    // Determine plan type from going with if not specified
    const planType = validated.planType || getPlanTypeFromGoingWith(validated.goingWith);
    const preferredCategories = GOING_WITH_CATEGORIES[validated.goingWith];

    // Get events in date range
    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: validated.dateStart,
          lte: validated.dateEnd,
        },
      },
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        venueName: true,
        address: true,
        neighborhood: true,
        startTime: true,
        endTime: true,
        priceRange: true,
        googleRating: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (events.length === 0) {
      return NextResponse.json({
        plans: [],
        message: "No events found in the selected date range",
      });
    }

    // Generate 2-3 plan options
    const plans = generatePlanOptions(events, validated.goingWith, planType, preferredCategories);

    return NextResponse.json({ plans });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plans" },
      { status: 500 }
    );
  }
}

function getPlanTypeFromGoingWith(goingWith: GoingWith): PlanType {
  switch (goingWith) {
    case "DATE":
      return "DATE_NIGHT";
    case "FRIENDS":
      return "SOCIAL";
    case "FAMILY":
      return "FAMILY_FUN";
    case "SOLO":
      return "SOLO_CHILL";
  }
}

interface EventForPlan {
  id: string;
  title: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: Date;
  endTime: Date | null;
  priceRange: string;
  googleRating: number | null;
}

interface GeneratedPlan {
  name: string;
  description: string;
  planType: PlanType;
  events: Array<{
    id: string;
    title: string;
    category: Category;
    venueName: string;
    neighborhood: string | null;
    startTime: Date;
    priceRange: string;
    order: number;
  }>;
  totalCost: string;
  neighborhoods: string[];
}

function generatePlanOptions(
  events: EventForPlan[],
  goingWith: GoingWith,
  planType: PlanType,
  preferredCategories: Category[]
): GeneratedPlan[] {
  const plans: GeneratedPlan[] = [];

  // Plan 1: Best matched to preferences
  const bestMatchPlan = createBestMatchPlan(events, goingWith, planType, preferredCategories);
  if (bestMatchPlan) plans.push(bestMatchPlan);

  // Plan 2: Budget-friendly option
  const budgetPlan = createBudgetPlan(events, goingWith, preferredCategories);
  if (budgetPlan) plans.push(budgetPlan);

  // Plan 3: Adventure/variety option
  const adventurePlan = createAdventurePlan(events, goingWith);
  if (adventurePlan) plans.push(adventurePlan);

  return plans;
}

function createBestMatchPlan(
  events: EventForPlan[],
  goingWith: GoingWith,
  planType: PlanType,
  preferredCategories: Category[]
): GeneratedPlan | null {
  // Filter events by preferred categories
  const matchingEvents = events.filter((e) =>
    preferredCategories.includes(e.category)
  );

  if (matchingEvents.length < 2) return null;

  // Select 2-3 events, prioritizing high ratings
  const sortedEvents = matchingEvents
    .sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0))
    .slice(0, 3);

  // Sort by start time
  sortedEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const planNames: Record<PlanType, string> = {
    DATE_NIGHT: "Perfect Date Night",
    SOCIAL: "Social Saturday",
    SOLO_CHILL: "Chill Solo Day",
    FAMILY_FUN: "Family Fun Day",
    CUSTOM: "Your Custom Plan",
  };

  const descriptions: Record<PlanType, string> = {
    DATE_NIGHT: "Romantic spots curated for a perfect evening",
    SOCIAL: "Great spots to enjoy with your crew",
    SOLO_CHILL: "Relaxing activities for quality me-time",
    FAMILY_FUN: "Fun for the whole family",
    CUSTOM: "A mix of activities you'll love",
  };

  return {
    name: planNames[planType],
    description: descriptions[planType],
    planType,
    events: sortedEvents.map((e, i) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      venueName: e.venueName,
      neighborhood: e.neighborhood,
      startTime: e.startTime,
      priceRange: e.priceRange,
      order: i,
    })),
    totalCost: calculateTotalCost(sortedEvents),
    neighborhoods: [...new Set(sortedEvents.map((e) => e.neighborhood).filter(Boolean))] as string[],
  };
}

function createBudgetPlan(
  events: EventForPlan[],
  goingWith: GoingWith,
  preferredCategories: Category[]
): GeneratedPlan | null {
  // Find free or cheap events
  const budgetEvents = events.filter((e) => {
    const price = e.priceRange.toLowerCase();
    if (price === "free" || price === "$0") return true;
    const nums = e.priceRange.match(/\d+/g);
    return nums && Math.max(...nums.map(Number)) <= 25;
  });

  // Prefer matching categories
  const preferredBudget = budgetEvents.filter((e) =>
    preferredCategories.includes(e.category)
  );

  const selectedEvents = preferredBudget.length >= 2
    ? preferredBudget.slice(0, 3)
    : budgetEvents.slice(0, 3);

  if (selectedEvents.length < 2) return null;

  selectedEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return {
    name: "Budget-Friendly Option",
    description: "Great experiences that won't break the bank",
    planType: "CUSTOM",
    events: selectedEvents.map((e, i) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      venueName: e.venueName,
      neighborhood: e.neighborhood,
      startTime: e.startTime,
      priceRange: e.priceRange,
      order: i,
    })),
    totalCost: calculateTotalCost(selectedEvents),
    neighborhoods: [...new Set(selectedEvents.map((e) => e.neighborhood).filter(Boolean))] as string[],
  };
}

function createAdventurePlan(
  events: EventForPlan[],
  goingWith: GoingWith
): GeneratedPlan | null {
  // Get events from diverse categories
  const categoryGroups = new Map<Category, EventForPlan[]>();
  for (const event of events) {
    const list = categoryGroups.get(event.category) || [];
    list.push(event);
    categoryGroups.set(event.category, list);
  }

  // Pick one event from each of 3 different categories
  const selectedEvents: EventForPlan[] = [];
  const usedCategories = new Set<Category>();

  for (const [category, categoryEvents] of categoryGroups) {
    if (selectedEvents.length >= 3) break;
    if (usedCategories.has(category)) continue;

    // Pick highest rated from this category
    const best = categoryEvents.sort(
      (a, b) => (b.googleRating || 0) - (a.googleRating || 0)
    )[0];
    if (best) {
      selectedEvents.push(best);
      usedCategories.add(category);
    }
  }

  if (selectedEvents.length < 2) return null;

  selectedEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return {
    name: "Adventure Mix",
    description: "Try something different with a variety of experiences",
    planType: "CUSTOM",
    events: selectedEvents.map((e, i) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      venueName: e.venueName,
      neighborhood: e.neighborhood,
      startTime: e.startTime,
      priceRange: e.priceRange,
      order: i,
    })),
    totalCost: calculateTotalCost(selectedEvents),
    neighborhoods: [...new Set(selectedEvents.map((e) => e.neighborhood).filter(Boolean))] as string[],
  };
}

function calculateTotalCost(events: EventForPlan[]): string {
  let total = 0;
  let allFree = true;

  for (const event of events) {
    const price = event.priceRange.toLowerCase();
    if (price !== "free" && price !== "$0") {
      allFree = false;
      const nums = event.priceRange.match(/\d+/g);
      if (nums) {
        total += Math.max(...nums.map(Number));
      }
    }
  }

  if (allFree) return "Free";
  if (total <= 25) return "Under $25";
  if (total <= 50) return "Under $50";
  if (total <= 100) return "Under $100";
  return `Around $${total}`;
}
