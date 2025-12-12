import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DenverTenure, RelationshipStatus, Category, PreferenceType } from "@prisma/client";

const onboardingSchema = z.object({
  denverTenure: z.nativeEnum(DenverTenure),
  relationshipStatus: z.nativeEnum(RelationshipStatus),
  preferences: z.array(
    z.object({
      category: z.nativeEnum(Category),
      level: z.enum(["love", "like", "dislike"]),
    })
  ),
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

  const { denverTenure, relationshipStatus, preferences } = parsed.data;
  const userId = session.user.id;

  // Update user profile and create preferences in a transaction
  await prisma.$transaction(async (tx) => {
    // Update user
    await tx.user.update({
      where: { id: userId },
      data: {
        denverTenure,
        relationshipStatus,
        onboardingComplete: true,
      },
    });

    // Delete existing preferences
    await tx.preference.deleteMany({
      where: { userId },
    });

    // Create new preferences
    const preferenceData = preferences
      .filter((p) => p.level !== "dislike") // Only store likes/loves
      .map((p) => ({
        userId,
        category: p.category,
        preferenceType: PreferenceType.LIKE,
        intensity: p.level === "love" ? 5 : 3,
      }));

    // Also store dislikes
    const dislikeData = preferences
      .filter((p) => p.level === "dislike")
      .map((p) => ({
        userId,
        category: p.category,
        preferenceType: PreferenceType.DISLIKE,
        intensity: 3,
      }));

    if (preferenceData.length > 0 || dislikeData.length > 0) {
      await tx.preference.createMany({
        data: [...preferenceData, ...dislikeData],
      });
    }
  });

  return NextResponse.json({ success: true });
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
      denverTenure: true,
      relationshipStatus: true,
      preferences: true,
    },
  });

  return NextResponse.json({ user });
}
