import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const constraintsSchema = z.object({
  preferredDays: z.array(
    z.enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ])
  ).optional(),
  preferredTimes: z.array(
    z.enum(["MORNING", "AFTERNOON", "EVENING", "LATE_NIGHT"])
  ).optional(),
  budgetMax: z.enum(["FREE", "UNDER_25", "UNDER_50", "UNDER_100", "ANY"]).optional(),
  neighborhoods: z.array(z.string()).optional(),
  homeNeighborhood: z.string().nullable().optional(),
  freeEventsOnly: z.boolean().optional(),
  discoveryMode: z.boolean().optional(),
  travelRadius: z.number().nullable().optional(),
});

// Get user's constraints
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const constraints = await prisma.userConstraints.findUnique({
    where: { userId: session.user.id },
  });

  // Return default constraints if none exist
  if (!constraints) {
    return NextResponse.json({
      constraints: {
        preferredDays: [],
        preferredTimes: [],
        budgetMax: "ANY",
        neighborhoods: [],
        homeNeighborhood: null,
        freeEventsOnly: false,
        discoveryMode: false,
        travelRadius: null,
      },
    });
  }

  return NextResponse.json({ constraints });
}

// Update user's constraints
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = constraintsSchema.parse(body);

    const constraints = await prisma.userConstraints.upsert({
      where: { userId: session.user.id },
      update: {
        preferredDays: validated.preferredDays,
        preferredTimes: validated.preferredTimes,
        budgetMax: validated.budgetMax,
        neighborhoods: validated.neighborhoods,
        homeNeighborhood: validated.homeNeighborhood,
        freeEventsOnly: validated.freeEventsOnly,
        discoveryMode: validated.discoveryMode,
        travelRadius: validated.travelRadius,
      },
      create: {
        userId: session.user.id,
        preferredDays: validated.preferredDays || [],
        preferredTimes: validated.preferredTimes || [],
        budgetMax: validated.budgetMax || "ANY",
        neighborhoods: validated.neighborhoods || [],
        homeNeighborhood: validated.homeNeighborhood || null,
        freeEventsOnly: validated.freeEventsOnly || false,
        discoveryMode: validated.discoveryMode || false,
        travelRadius: validated.travelRadius || null,
      },
    });

    return NextResponse.json({ success: true, constraints });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Constraints error:", error);
    return NextResponse.json(
      { error: "Failed to save constraints" },
      { status: 500 }
    );
  }
}

// Partially update constraints (PATCH)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = constraintsSchema.partial().parse(body);

    // First ensure constraint record exists
    const existing = await prisma.userConstraints.findUnique({
      where: { userId: session.user.id },
    });

    if (!existing) {
      // Create with defaults and provided values
      const constraints = await prisma.userConstraints.create({
        data: {
          userId: session.user.id,
          preferredDays: validated.preferredDays || [],
          preferredTimes: validated.preferredTimes || [],
          budgetMax: validated.budgetMax || "ANY",
          neighborhoods: validated.neighborhoods || [],
          homeNeighborhood: validated.homeNeighborhood ?? null,
          freeEventsOnly: validated.freeEventsOnly || false,
          discoveryMode: validated.discoveryMode || false,
          travelRadius: validated.travelRadius ?? null,
        },
      });
      return NextResponse.json({ success: true, constraints });
    }

    // Update only provided fields
    const updateData: Record<string, unknown> = {};
    if (validated.preferredDays !== undefined) updateData.preferredDays = validated.preferredDays;
    if (validated.preferredTimes !== undefined) updateData.preferredTimes = validated.preferredTimes;
    if (validated.budgetMax !== undefined) updateData.budgetMax = validated.budgetMax;
    if (validated.neighborhoods !== undefined) updateData.neighborhoods = validated.neighborhoods;
    if (validated.homeNeighborhood !== undefined) updateData.homeNeighborhood = validated.homeNeighborhood;
    if (validated.freeEventsOnly !== undefined) updateData.freeEventsOnly = validated.freeEventsOnly;
    if (validated.discoveryMode !== undefined) updateData.discoveryMode = validated.discoveryMode;
    if (validated.travelRadius !== undefined) updateData.travelRadius = validated.travelRadius;

    const constraints = await prisma.userConstraints.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, constraints });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Constraints patch error:", error);
    return NextResponse.json(
      { error: "Failed to update constraints" },
      { status: 500 }
    );
  }
}
