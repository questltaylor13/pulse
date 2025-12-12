import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BudgetPreference, SocialIntent } from "@prisma/client";

const detailedPreferencesSchema = z.object({
  // Going With (1-5 intensity or null)
  goingSolo: z.number().min(1).max(5).nullable().optional(),
  goingDate: z.number().min(1).max(5).nullable().optional(),
  goingFriends: z.number().min(1).max(5).nullable().optional(),
  goingFamily: z.number().min(1).max(5).nullable().optional(),

  // Time Preferences (1-5 intensity or null)
  timeWeeknight: z.number().min(1).max(5).nullable().optional(),
  timeWeekend: z.number().min(1).max(5).nullable().optional(),
  timeMorning: z.number().min(1).max(5).nullable().optional(),
  timeDaytime: z.number().min(1).max(5).nullable().optional(),
  timeEvening: z.number().min(1).max(5).nullable().optional(),
  timeLateNight: z.number().min(1).max(5).nullable().optional(),

  // Budget
  budget: z.enum(["FREE", "UNDER_25", "UNDER_50", "UNDER_100", "ANY"]).optional(),

  // Vibe (1-5 intensity or null)
  vibeChill: z.number().min(1).max(5).nullable().optional(),
  vibeModerate: z.number().min(1).max(5).nullable().optional(),
  vibeHighEnergy: z.number().min(1).max(5).nullable().optional(),

  // Social Intent
  socialIntent: z.enum(["MEET_PEOPLE", "OWN_THING", "EITHER"]).optional(),
});

// Get user's detailed preferences
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.detailedPreferences.findUnique({
    where: { userId: session.user.id },
  });

  // Return default preferences if none exist
  if (!preferences) {
    return NextResponse.json({
      preferences: {
        goingSolo: null,
        goingDate: null,
        goingFriends: null,
        goingFamily: null,
        timeWeeknight: null,
        timeWeekend: null,
        timeMorning: null,
        timeDaytime: null,
        timeEvening: null,
        timeLateNight: null,
        budget: "ANY",
        vibeChill: null,
        vibeModerate: null,
        vibeHighEnergy: null,
        socialIntent: "EITHER",
      },
    });
  }

  return NextResponse.json({ preferences });
}

// Create or update user's detailed preferences
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = detailedPreferencesSchema.parse(body);

    const preferences = await prisma.detailedPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        goingSolo: validated.goingSolo,
        goingDate: validated.goingDate,
        goingFriends: validated.goingFriends,
        goingFamily: validated.goingFamily,
        timeWeeknight: validated.timeWeeknight,
        timeWeekend: validated.timeWeekend,
        timeMorning: validated.timeMorning,
        timeDaytime: validated.timeDaytime,
        timeEvening: validated.timeEvening,
        timeLateNight: validated.timeLateNight,
        budget: validated.budget as BudgetPreference | undefined,
        vibeChill: validated.vibeChill,
        vibeModerate: validated.vibeModerate,
        vibeHighEnergy: validated.vibeHighEnergy,
        socialIntent: validated.socialIntent as SocialIntent | undefined,
      },
      create: {
        userId: session.user.id,
        goingSolo: validated.goingSolo ?? null,
        goingDate: validated.goingDate ?? null,
        goingFriends: validated.goingFriends ?? null,
        goingFamily: validated.goingFamily ?? null,
        timeWeeknight: validated.timeWeeknight ?? null,
        timeWeekend: validated.timeWeekend ?? null,
        timeMorning: validated.timeMorning ?? null,
        timeDaytime: validated.timeDaytime ?? null,
        timeEvening: validated.timeEvening ?? null,
        timeLateNight: validated.timeLateNight ?? null,
        budget: (validated.budget as BudgetPreference) || "ANY",
        vibeChill: validated.vibeChill ?? null,
        vibeModerate: validated.vibeModerate ?? null,
        vibeHighEnergy: validated.vibeHighEnergy ?? null,
        socialIntent: (validated.socialIntent as SocialIntent) || "EITHER",
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Preferences error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}

// Partially update preferences (PATCH)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = detailedPreferencesSchema.partial().parse(body);

    // First ensure record exists
    const existing = await prisma.detailedPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!existing) {
      // Create with defaults and provided values
      const preferences = await prisma.detailedPreferences.create({
        data: {
          userId: session.user.id,
          goingSolo: validated.goingSolo ?? null,
          goingDate: validated.goingDate ?? null,
          goingFriends: validated.goingFriends ?? null,
          goingFamily: validated.goingFamily ?? null,
          timeWeeknight: validated.timeWeeknight ?? null,
          timeWeekend: validated.timeWeekend ?? null,
          timeMorning: validated.timeMorning ?? null,
          timeDaytime: validated.timeDaytime ?? null,
          timeEvening: validated.timeEvening ?? null,
          timeLateNight: validated.timeLateNight ?? null,
          budget: (validated.budget as BudgetPreference) || "ANY",
          vibeChill: validated.vibeChill ?? null,
          vibeModerate: validated.vibeModerate ?? null,
          vibeHighEnergy: validated.vibeHighEnergy ?? null,
          socialIntent: (validated.socialIntent as SocialIntent) || "EITHER",
        },
      });
      return NextResponse.json({ success: true, preferences });
    }

    // Build update data only for provided fields
    const updateData: Record<string, unknown> = {};
    if (validated.goingSolo !== undefined) updateData.goingSolo = validated.goingSolo;
    if (validated.goingDate !== undefined) updateData.goingDate = validated.goingDate;
    if (validated.goingFriends !== undefined) updateData.goingFriends = validated.goingFriends;
    if (validated.goingFamily !== undefined) updateData.goingFamily = validated.goingFamily;
    if (validated.timeWeeknight !== undefined) updateData.timeWeeknight = validated.timeWeeknight;
    if (validated.timeWeekend !== undefined) updateData.timeWeekend = validated.timeWeekend;
    if (validated.timeMorning !== undefined) updateData.timeMorning = validated.timeMorning;
    if (validated.timeDaytime !== undefined) updateData.timeDaytime = validated.timeDaytime;
    if (validated.timeEvening !== undefined) updateData.timeEvening = validated.timeEvening;
    if (validated.timeLateNight !== undefined) updateData.timeLateNight = validated.timeLateNight;
    if (validated.budget !== undefined) updateData.budget = validated.budget;
    if (validated.vibeChill !== undefined) updateData.vibeChill = validated.vibeChill;
    if (validated.vibeModerate !== undefined) updateData.vibeModerate = validated.vibeModerate;
    if (validated.vibeHighEnergy !== undefined) updateData.vibeHighEnergy = validated.vibeHighEnergy;
    if (validated.socialIntent !== undefined) updateData.socialIntent = validated.socialIntent;

    const preferences = await prisma.detailedPreferences.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Preferences patch error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
