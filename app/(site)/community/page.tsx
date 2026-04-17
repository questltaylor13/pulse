"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SplitLayout from "@/components/layouts/SplitLayout";
import GroupActivityCard from "@/components/community/GroupActivityCard";
import TrendingSection from "@/components/community/TrendingSection";
import YourStatsSidebar from "@/components/community/YourStatsSidebar";
import LeaderboardTable from "@/components/leaderboards/LeaderboardTable";
import BadgeCard from "@/components/badges/BadgeCard";
import { Category } from "@prisma/client";

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

interface Group {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  members: {
    user: {
      id: string;
      name: string | null;
      profileImageUrl: string | null;
    };
  }[];
  groupEvents: {
    event: {
      id: string;
      title: string;
      startTime: Date | string;
    };
  }[];
}

interface TrendingEvent {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  neighborhood: string | null;
  startTime: Date | string;
  imageUrl: string | null;
  saveCount: number;
}

interface HotPlace {
  id: string;
  title: string;
  category: Category;
  neighborhood: string | null;
  imageUrl: string | null;
  isNew: boolean;
  isUpcoming: boolean;
  isSoftOpen: boolean;
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [topLeaderboard, setTopLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBadges, setRecentBadges] = useState<Badge[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [hotPlaces, setHotPlaces] = useState<HotPlace[]>([]);

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
      const [leaderboardRes, badgesRes, groupsRes, trendingRes] = await Promise.all([
        fetch("/api/leaderboards?limit=5"),
        fetch("/api/badges?filter=earned"),
        fetch("/api/groups"),
        fetch("/api/trending?limit=6"),
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setTopLeaderboard(data.entries || []);
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
        setRecentBadges(data.badges?.slice(0, 4) || []);
        if (userStats) {
          setUserStats((prev) =>
            prev ? { ...prev, totalBadgesEarned: data.badges?.length || 0 } : null
          );
        }
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setUserGroups(data.groups || []);
      }

      if (trendingRes.ok) {
        const data = await trendingRes.json();
        setTrendingEvents(data.events || []);
        setHotPlaces(data.places || []);
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

  // Main content
  const mainContent = (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-50 to-pink-50 rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          What&apos;s Happening in Denver
        </h1>
        <p className="text-slate-600">
          See what your friends and the community are exploring
        </p>
      </div>

      {/* Section 1: Your Groups (Social First!) */}
      <section>
        <GroupActivityCard groups={userGroups} />
      </section>

      {/* Section 2: Trending Events & Hot Places */}
      <section>
        <TrendingSection events={trendingEvents} places={hotPlaces} />
      </section>

      {/* Section 3: Leaderboard Preview (Moved Down) */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>🏆</span>
            Denver&apos;s Top Explorers
          </h2>
          <Link
            href="/community/leaderboards"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View Full Leaderboard
          </Link>
        </div>

        {topLeaderboard.length > 0 ? (
          <>
            <LeaderboardTable
              entries={topLeaderboard.slice(0, 5)}
              currentUserId={session?.user?.id}
            />
            {userStats?.rank && userStats.rank > 5 && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center text-sm text-slate-600">
                You&apos;re #{userStats.rank} this month
                {userStats.rank <= 20 && " — Keep going! 💪"}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">
              No leaderboard entries yet. Start attending events!
            </p>
          </div>
        )}
      </section>

      {/* Section 4: Badges You're Close To */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>🎖️</span>
            Your Badges
          </h2>
          <Link
            href="/community/badges"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View All Badges
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
            <p className="text-slate-500 mb-4">
              No badges earned yet. Keep exploring to earn your first badge!
            </p>
            <Link
              href="/feed"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
            >
              Browse Events
            </Link>
          </div>
        )}
      </section>
    </div>
  );

  // Sidebar content
  const sidebarContent = (
    <div className="space-y-6">
      {/* Your Stats */}
      <YourStatsSidebar
        rank={userStats?.rank || null}
        score={userStats?.score || null}
        badgesEarned={recentBadges.length}
        currentStreak={userStats?.currentStreak || 0}
      />

      {/* Quick Links */}
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Explore</h3>
        <div className="space-y-2">
          <Link
            href="/community/leaderboards"
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="text-xl">🏆</span>
            <div>
              <p className="font-medium text-slate-900 text-sm">Leaderboards</p>
              <p className="text-xs text-slate-500">See top explorers</p>
            </div>
          </Link>
          <Link
            href="/community/badges"
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="text-xl">🎖️</span>
            <div>
              <p className="font-medium text-slate-900 text-sm">Badges</p>
              <p className="text-xs text-slate-500">View all badges</p>
            </div>
          </Link>
          <Link
            href="/groups"
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="text-xl">👥</span>
            <div>
              <p className="font-medium text-slate-900 text-sm">Groups</p>
              <p className="text-xs text-slate-500">Plan with friends</p>
            </div>
          </Link>
          <Link
            href="/friends"
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="text-xl">🤝</span>
            <div>
              <p className="font-medium text-slate-900 text-sm">Friends</p>
              <p className="text-xs text-slate-500">Find & connect</p>
            </div>
          </Link>
          <Link
            href="/influencers"
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="text-xl">✨</span>
            <div>
              <p className="font-medium text-slate-900 text-sm">Creators</p>
              <p className="text-xs text-slate-500">Follow tastemakers</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Invite Friends CTA */}
      <div className="card bg-gradient-to-br from-primary/5 to-purple-50">
        <h3 className="font-semibold text-slate-900 mb-2">Invite Friends</h3>
        <p className="text-sm text-slate-600 mb-4">
          Explore Denver together! Share Pulse with friends.
        </p>
        <button className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium">
          Share Invite Link
        </button>
      </div>
    </div>
  );

  return (
    <SplitLayout main={mainContent} sidebar={sidebarContent} />
  );
}
