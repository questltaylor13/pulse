import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// Get user's referral code and stats
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      referralsGiven: {
        select: {
          id: true,
          createdAt: true,
          referred: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    referralCode: user.referralCode,
    referralCount: user.referralsGiven.length,
    referrals: user.referralsGiven.map((r) => ({
      id: r.id,
      user: {
        id: r.referred.id,
        name: r.referred.name,
        profileImageUrl: r.referred.profileImageUrl,
      },
      joinedAt: r.referred.createdAt,
    })),
  });
}

// Generate a referral code
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user already has a referral code, return it
  if (user.referralCode) {
    return NextResponse.json({ referralCode: user.referralCode });
  }

  // Generate a new referral code
  const referralCode = nanoid(8).toUpperCase();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { referralCode },
  });

  return NextResponse.json({ referralCode });
}
