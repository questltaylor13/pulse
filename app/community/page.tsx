"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LeaderboardTable from "@/components/leaderboards/LeaderboardTable";
import BadgeCard from "@/components/badges/BadgeCard";

interface UserStats {
  rank: number | null;
  score: number | null;
  eventsAttended: number;
  currentStreak: number;
  totalBadgesEarned: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  username: string | null;
  profileImageUrl: string | null;
  score: number;
  eventsAttended: number;
  uniquePlaces: number;
  neighborhoodsVisited: number;
  topBadge?: { emoji: string; name: string };
}

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  emoji: string;
  colorHex: string;
  isEarned: boolean;
  earnedAt: Date | null;
  isPinned: boolean;
  progress: number;
  requirementValue: number;
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [topLeaderboard, setTopLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [leaderboardRes, badgesRes] = await Promise.all([
        fetch("/api/leaderboards?limit=5"),
        fetch("/api/badges?filter=earned"),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setTopLeaderboard(data.entries);
        if (data.currentUserRank) {
          setUserStats({
            rank: data.currentUserRank,
            score: data.currentUserScore,
            eventsAttended: 0,
            currentStreak: 0,
            totalBadgesEarned: 0,
          });
        }
      }

      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setRecentBadges(data.badges.slice(0, 4));
        if (userStats) {
          setUserStats((prev) =>
            prev
              ? { ...prev, totalBadgesEarned: data.badges.length }
              : null
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch community data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-100 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              Community Hub
            </h1>
            <p className="text-slate-600">
              Compete, earn badges, and explore Denver together
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {userStats?.rank ? `#${userStats.rank}` : "--"}
              </p>
              <p className="text-sm text-slate-500">Your Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {recentBadges.length}
              </p>
              <p className="text-sm text-slate-500">Badges Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {userStats?.score?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-slate-500">Points</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Link
          href="/community/leaderboards"
          className="card hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="font-semibold text-slate-900">Leaderboards</h3>
          <p className="text-sm text-slate-500">See top explorers</p>
        </Link>
        <Link
          href="/community/badges"
          className="card hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-3xl mb-2">🎖️</div>
          <h3 className="font-semibold text-slate-900">Badges</h3>
          <p className="text-sm text-slate-500">View all badges</p>
        </Link>
        <Link
          href="/groups"
          className="card hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-semibold text-slate-900">Groups</h3>
          <p className="text-sm text-slate-500">Explore with friends</p>
        </Link>
        <Link
          href="/influencers"
          className="card hover:shadow-lg transition-shadow text-center"
        >
          <div className="text-3xl mb-2">✨</div>
          <h3 className="font-semibold text-slate-900">Creators</h3>
          <p className="text-sm text-slate-500">Follow tastemakers</p>
        </Link>
      </div>

      {/* Leaderboard Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            This Month&apos;s Top Explorers
          </h2>
          <Link
            href="/community/leaderboards"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View All
          </Link>
        </div>
        {topLeaderboard.length > 0 ? (
          <LeaderboardTable
            entries={topLeaderboard}
            currentUserId={session?.user?.id}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">
              No leaderboard entries yet. Start attending events!
            </p>
          </div>
        )}
      </div>

      {/* Recent Badges */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Your Recent Badges
          </h2>
          <Link
            href="/community/badges"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View All
          </Link>
        </div>
        {recentBadges.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {recentBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                emoji={badge.emoji}
                name={badge.name}
                description={badge.description}
                tier={badge.tier}
                category={badge.category as any}
                colorHex={badge.colorHex}
                isEarned={badge.isEarned}
                earnedAt={badge.earnedAt}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">
              No badges earned yet. Keep exploring to earn your first badge!
            </p>
            <Link
              href="/feed"
              className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
