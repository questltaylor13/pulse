"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserStats, TimeRange } from "@/lib/actions/stats";
import { Category } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";

// Stats page uses solid background colors for chart bars (different from shared CATEGORY_COLORS)
const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-500",
  LIVE_MUSIC: "bg-pink-500",
  BARS: "bg-amber-500",
  FOOD: "bg-orange-500",
  COFFEE: "bg-yellow-500",
  OUTDOORS: "bg-green-500",
  FITNESS: "bg-blue-500",
  SEASONAL: "bg-red-500",
  POPUP: "bg-indigo-500",
  OTHER: "bg-slate-500",
  RESTAURANT: "bg-orange-500",
  ACTIVITY_VENUE: "bg-cyan-500",
};

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: "all", label: "All time" },
];

interface StatsData {
  totalViews: number;
  totalWant: number;
  totalDone: number;
  topCategories: { category: Category; count: number }[];
  topTags: { tag: string; count: number }[];
  vibeSummary: string;
  streakWeeks: number;
  range: TimeRange;
}

function StatsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range");
  const initialRange: TimeRange =
    rangeParam === "7" ? 7 :
    rangeParam === "90" ? 90 :
    rangeParam === "all" ? "all" : 30;

  const [range, setRange] = useState<TimeRange>(initialRange);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (!session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [session, status, router]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserStats(range);
      setStats(data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (session?.user?.onboardingComplete) {
      fetchStats();
    }
  }, [session, fetchStats]);

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    router.push(`/stats?range=${newRange}`);
  };

  if (status === "loading" || !session?.user?.onboardingComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const maxCategoryCount = stats?.topCategories[0]?.count || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Your Pulse Wrapped
          <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Preview
          </span>
        </h1>
        <p className="mt-2 text-slate-600">
          A snapshot of your Denver adventures
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => handleRangeChange(tr.value)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                range === tr.value
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 w-1/2 rounded bg-slate-200 mb-4" />
              <div className="h-12 w-3/4 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Vibe Summary */}
          <div className="card bg-gradient-to-br from-primary to-primary-dark text-white">
            <h2 className="mb-2 text-lg font-medium opacity-90">Your Vibe</h2>
            <p className="text-2xl font-semibold">{stats.vibeSummary}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Views */}
            <div className="card">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Events Viewed
              </div>
              <div className="text-4xl font-bold text-slate-900">{stats.totalViews}</div>
            </div>

            {/* Want */}
            <div className="card">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Want to do
              </div>
              <div className="text-4xl font-bold text-slate-900">{stats.totalWant}</div>
            </div>

            {/* Done */}
            <div className="card">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Done
              </div>
              <div className="text-4xl font-bold text-slate-900">{stats.totalDone}</div>
            </div>

            {/* Streak */}
            <div className="card">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
                  />
                </svg>
                Week Streak
              </div>
              <div className="text-4xl font-bold text-slate-900">
                {stats.streakWeeks}
                <span className="ml-1 text-lg font-normal text-slate-500">weeks</span>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          {stats.topCategories.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Categories</h2>
              <div className="space-y-3">
                {stats.topCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-slate-700">
                      {CATEGORY_LABELS[cat.category]}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[cat.category]}`}
                          style={{
                            width: `${(cat.count / maxCategoryCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-slate-600">
                      {cat.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Tags */}
          {stats.topTags.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Tags</h2>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
                  >
                    <span className="text-slate-700">{tag.tag}</span>
                    <span className="text-xs text-slate-500">({tag.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stats.totalViews === 0 && stats.totalWant === 0 && stats.totalDone === 0 && (
            <div className="card text-center py-12">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
                <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No activity yet</h3>
              <p className="mb-4 text-slate-600">
                Start exploring events to build your stats!
              </p>
              <Link href="/feed" className="btn-primary">
                Discover events
              </Link>
            </div>
          )}
        </>
      ) : null}

      {/* Navigation */}
      <div className="flex justify-center gap-4">
        <Link
          href="/lists/want"
          className="text-sm text-slate-600 hover:text-primary hover:underline"
        >
          View want list
        </Link>
        <Link
          href="/lists/done"
          className="text-sm text-slate-600 hover:text-primary hover:underline"
        >
          View done list
        </Link>
        <Link
          href="/feed"
          className="text-sm text-slate-600 hover:text-primary hover:underline"
        >
          Discover more events
        </Link>
      </div>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<StatsLoading />}>
      <StatsContent />
    </Suspense>
  );
}
