import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllBadgesWithProgress,
  getUserEarnedBadges,
  checkAndAwardBadges,
  toggleBadgePin,
} from "@/lib/badges";

// Get all badges with user's progress
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter"); // "all", "earned", "progress"
  const category = searchParams.get("category"); // BadgeCategory filter

  if (filter === "earned") {
    const badges = await getUserEarnedBadges(session.user.id);
    return NextResponse.json({
      badges: badges.map((ub) => ({
        ...ub.badge,
        earnedAt: ub.earnedAt,
        isPinned: ub.isPinned,
      })),
    });
  }

  const allBadges = await getAllBadgesWithProgress(session.user.id);

  // Filter by category if specified
  const filteredBadges = category
    ? allBadges.filter((b) => b.category === category)
    : allBadges;

  // Filter out hidden badges that haven't been earned
  const visibleBadges = filteredBadges.filter((b) => !b.isHidden || b.isEarned);

  return NextResponse.json({
    badges: visibleBadges,
    stats: {
      total: allBadges.length,
      earned: allBadges.filter((b) => b.isEarned).length,
    },
  });
}

// Check badges (trigger after actions) or toggle pin
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, badgeId } = body;

  if (action === "check") {
    // Check and award any earned badges
    const awardedBadges = await checkAndAwardBadges(session.user.id);
    return NextResponse.json({
      awarded: awardedBadges,
      message: awardedBadges.length > 0
        ? `Congratulations! You earned: ${awardedBadges.join(", ")}`
        : "No new badges earned",
    });
  }

  if (action === "pin" && badgeId) {
    try {
      const isPinned = await toggleBadgePin(session.user.id, badgeId);
      return NextResponse.json({ isPinned });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to pin badge" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
