import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLeaderboard, getUserRankInfo, getCurrentPeriod } from "@/lib/leaderboards";
import { LeaderboardType } from "@prisma/client";

// Get leaderboard
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get("period") || getCurrentPeriod(); // "2025-12" or "all-time"
  const type = (searchParams.get("type") as LeaderboardType) || LeaderboardType.OVERALL;
  const typeValue = searchParams.get("typeValue") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const myRank = searchParams.get("myRank") === "true";

  // If only requesting current user's rank
  if (myRank && session?.user?.id) {
    const rankInfo = await getUserRankInfo(session.user.id, period);
    return NextResponse.json({ rankInfo });
  }

  const leaderboard = await getLeaderboard({
    period,
    type,
    typeValue,
    limit,
    userId: session?.user?.id,
  });

  return NextResponse.json(leaderboard);
}
