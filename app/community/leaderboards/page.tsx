"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LeaderboardTable from "@/components/leaderboards/LeaderboardTable";
import { LeaderboardType } from "@prisma/client";

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

interface LeaderboardData {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  currentUserScore?: number;
  period: string;
  type: LeaderboardType;
}

type Period = "this-month" | "all-time";

export default function LeaderboardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("this-month");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchLeaderboard();
  }, [session, status, router, period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const periodParam = period === "all-time" ? "all-time" : undefined;
      const url = periodParam
        ? `/api/leaderboards?period=${periodParam}&limit=50`
        : "/api/leaderboards?limit=50";

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthName = () => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaderboards</h1>
          <p className="text-slate-600">See who&apos;s exploring Denver the most</p>
        </div>
        <Link
          href="/community"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Back to Community
        </Link>
      </div>

      {/* User's Rank Card */}
      {leaderboard?.currentUserRank && (
        <div className="bg-gradient-to-r from-primary/10 to-purple-100 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Your Current Rank</p>
              <p className="text-4xl font-bold text-primary">
                #{leaderboard.currentUserRank}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Your Score</p>
              <p className="text-2xl font-bold text-slate-900">
                {leaderboard.currentUserScore?.toLocaleString()} pts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setPeriod("this-month")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            period === "this-month"
              ? "border-primary text-primary"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {getCurrentMonthName()}
        </button>
        <button
          onClick={() => setPeriod("all-time")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            period === "all-time"
              ? "border-primary text-primary"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          All Time
        </button>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : leaderboard && leaderboard.entries.length > 0 ? (
        <LeaderboardTable
          entries={leaderboard.entries}
          currentUserId={session?.user?.id}
          showDetails
        />
      ) : (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No rankings yet
          </h3>
          <p className="text-slate-600 mb-4">
            Start attending events to appear on the leaderboard!
          </p>
          <Link
            href="/feed"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            Browse Events
          </Link>
        </div>
      )}

      {/* Scoring Explanation */}
      <div className="card bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-3">How Scoring Works</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              10
            </div>
            <div>
              <p className="font-medium text-slate-900">Per Event</p>
              <p className="text-sm text-slate-600">Points for each event attended</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              5
            </div>
            <div>
              <p className="font-medium text-slate-900">Per Unique Place</p>
              <p className="text-sm text-slate-600">Bonus for new venues</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              15
            </div>
            <div>
              <p className="font-medium text-slate-900">Per Neighborhood</p>
              <p className="text-sm text-slate-600">Explore different areas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
