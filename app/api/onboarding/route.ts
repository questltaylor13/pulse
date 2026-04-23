import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  ContextSegment,
  SocialStyleType,
  PlanningStyle,
  BudgetTier,
} from "@prisma/client";
import { computeDerivedScores } from "@/lib/onboarding/scoring";

const vibePairSchema = z.object({
  pair: z.number().int().min(1).max(4),
  selected: z.enum(["A", "B"]),
});

const onboardingSchema = z.object({
  contextSegment: z.nativeEnum(ContextSegment),
  socialStyle: z.nativeEnum(SocialStyleType),
  vibePreferences: z.array(vibePairSchema).length(4),
  planningStyle: z.nativeEnum(PlanningStyle),
  budgetTier: z.nativeEnum(BudgetTier),
  sparkResponse: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    contextSegment,
    socialStyle,
    vibePreferences,
    planningStyle,
    budgetTier,
    sparkResponse,
  } = parsed.data;
  const userId = session.user.id;

  const scores = computeDerivedScores(vibePreferences, contextSegment);

  const profile = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
    });

    return tx.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        contextSegment,
        socialStyle,
        vibePreferences: JSON.parse(JSON.stringify(vibePreferences)),
        planningStyle,
        budgetTier,
        sparkResponse: sparkResponse || null,
        ...scores,
      },
      update: {
        contextSegment,
        socialStyle,
        vibePreferences: JSON.parse(JSON.stringify(vibePreferences)),
        planningStyle,
        budgetTier,
        sparkResponse: sparkResponse || null,
        ...scores,
        // PRD 6 Phase 2 — bump version so the precompute cron knows to re-rank.
        version: { increment: 1 },
      },
    });
  });

  // PRD 6 Phase 2 — invalidate the ranked-feed cache so the profile change
  // takes effect on next precompute. Non-fatal if it fails.
  try {
    const { markDirty } = await import("@/lib/ranking/cache");
    await markDirty(userId);
  } catch (err) {
    console.warn("[onboarding] markDirty failed:", err);
  }

  return NextResponse.json({ success: true, profile });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingComplete: true,
      profile: true,
    },
  });

  return NextResponse.json({ user });
}
