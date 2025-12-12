"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { BadgeCategory } from "@prisma/client";

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  emoji: string;
  colorHex: string;
  isHidden: boolean;
  requirementType: string;
  requirementValue: number;
  progress: number;
  isEarned: boolean;
  earnedAt: Date | null;
  isPinned: boolean;
}

interface BadgeStats {
  total: number;
  earned: number;
}

type FilterTab = "all" | "earned" | "progress";

const CATEGORY_FILTERS: { value: BadgeCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "MILESTONE", label: "Milestones" },
  { value: "EXPLORER", label: "Explorer" },
  { value: "CATEGORY_FAN", label: "Category Fan" },
  { value: "STREAK", label: "Streaks" },
  { value: "SOCIAL", label: "Social" },
  { value: "PIONEER", label: "Pioneer" },
  { value: "SPECIAL", label: "Special" },
];

export default function BadgesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats>({ total: 0, earned: 0 });
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<BadgeCategory | "all">("all");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchBadges();
  }, [session, status, router]);

  const fetchBadges = async () => {
    try {
      const response = await fetch("/api/badges");
      if (response.ok) {
        const data = await response.json();
        setBadges(data.badges);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (badgeId: string) => {
    try {
      const response = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin", badgeId }),
      });

      if (response.ok) {
        const { isPinned } = await response.json();
        setBadges((prev) =>
          prev.map((b) => (b.id === badgeId ? { ...b, isPinned } : b))
        );
      }
    } catch (error) {
      console.error("Failed to pin badge:", error);
    }
  };

  // Filter badges based on tab and category
  const filteredBadges = badges.filter((badge) => {
    // Category filter
    if (categoryFilter !== "all" && badge.category !== categoryFilter) {
      return false;
    }

    // Tab filter
    if (filterTab === "earned" && !badge.isEarned) {
      return false;
    }
    if (filterTab === "progress" && badge.isEarned) {
      return false;
    }

    return true;
  });

  if (status === "loading" || loading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Badges</h1>
          <p className="text-slate-600">
            {stats.earned} of {stats.total} badges earned
          </p>
        </div>
        <Link
          href="/community"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Back to Community
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-slate-900">Badge Progress</span>
          <span className="text-sm text-slate-600">
            {Math.round((stats.earned / stats.total) * 100)}% complete
          </span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
            style={{ width: `${(stats.earned / stats.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            filterTab === "all"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Badges
        </button>
        <button
          onClick={() => setFilterTab("earned")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            filterTab === "earned"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Earned ({stats.earned})
        </button>
        <button
          onClick={() => setFilterTab("progress")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            filterTab === "progress"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          In Progress ({stats.total - stats.earned})
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`px-3 py-1 text-sm rounded-full transition ${
              categoryFilter === cat.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      {filteredBadges.length > 0 ? (
        <BadgeGrid
          badges={filteredBadges}
          onPin={handlePin}
          showCategories={categoryFilter === "all"}
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
            No badges found
          </h3>
          <p className="text-slate-600">
            {filterTab === "earned"
              ? "You haven't earned any badges yet. Keep exploring!"
              : "No badges match your current filters."}
          </p>
        </div>
      )}
    </div>
  );
}
