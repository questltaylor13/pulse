"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, ItemType } from "@prisma/client";

interface InfluencerPick {
  id: string;
  title: string;
  type: ItemType;
  category: Category;
  venueName: string;
  reason: string;
}

interface FollowedInfluencer {
  id: string;
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
  profileColor: string | null;
  latestPicks: InfluencerPick[];
}

const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-100 text-purple-700",
  LIVE_MUSIC: "bg-pink-100 text-pink-700",
  BARS: "bg-amber-100 text-amber-700",
  FOOD: "bg-orange-100 text-orange-700",
  COFFEE: "bg-yellow-100 text-yellow-700",
  OUTDOORS: "bg-green-100 text-green-700",
  FITNESS: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-red-100 text-red-700",
  POPUP: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  ACTIVITY_VENUE: "bg-cyan-100 text-cyan-700",
};

const CATEGORY_LABELS: Record<Category, string> = {
  ART: "Art",
  LIVE_MUSIC: "Live Music",
  BARS: "Bars",
  FOOD: "Food",
  COFFEE: "Coffee",
  OUTDOORS: "Outdoors",
  FITNESS: "Fitness",
  SEASONAL: "Seasonal",
  POPUP: "Pop-up",
  OTHER: "Other",
  RESTAURANT: "Restaurant",
  ACTIVITY_VENUE: "Activity",
};

function PickCard({ pick, influencer }: { pick: InfluencerPick; influencer: FollowedInfluencer }) {
  const linkHref = pick.type === "PLACE" ? `/places/${pick.id}` : `/events/${pick.id}`;

  return (
    <Link href={linkHref}>
      <div className="group flex-shrink-0 w-80 rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-lg hover:border-primary">
        {/* Curator header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0"
            style={{ backgroundColor: influencer.profileColor || "#e2e8f0" }}
          >
            {influencer.profileImageUrl ? (
              <Image
                src={influencer.profileImageUrl}
                alt={influencer.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white text-sm font-bold">
                {influencer.displayName[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {influencer.displayName}
            </p>
            <p className="text-xs text-slate-400">recommends</p>
          </div>
        </div>

        {/* Pick content */}
        <div className="space-y-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[pick.category]}`}
          >
            {CATEGORY_LABELS[pick.category]}
          </span>
          <h4 className="font-semibold text-slate-900 group-hover:text-primary transition line-clamp-1">
            {pick.title}
          </h4>
          <p className="text-sm text-slate-500 truncate">{pick.venueName}</p>
          {pick.reason && (
            <p className="text-sm text-slate-600 italic line-clamp-2">
              "{pick.reason}"
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function FollowedCreatorPicksSection() {
  const [followedCreators, setFollowedCreators] = useState<FollowedInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchFollowedCreators() {
      try {
        const response = await fetch("/api/influencers");
        if (response.ok) {
          const data = await response.json();
          // Filter to only show followed creators with picks
          const followed = data.influencers.filter(
            (inf: any) => inf.isFollowed && inf.latestPicks.length > 0
          );
          setFollowedCreators(followed);
        }
      } catch (error) {
        console.error("Failed to fetch followed creators:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFollowedCreators();
  }, []);

  // Flatten all picks with their creator info for display
  const allPicks = followedCreators.flatMap((creator) =>
    creator.latestPicks.map((pick) => ({ pick, influencer: creator }))
  );

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-slate-600">Loading your curators' picks...</span>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't follow any curators with picks
  if (followedCreators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <svg
              className="h-5 w-5 text-emerald-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              From Curators You Follow
            </h2>
            <p className="text-sm text-slate-600">
              {followedCreators.length} curator{followedCreators.length !== 1 ? "s" : ""} with fresh picks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/feed/following"
            className="text-sm text-emerald-600 hover:underline"
          >
            See activity
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <svg
              className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Picks */}
      {!collapsed && (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {allPicks.slice(0, 6).map(({ pick, influencer }, index) => (
            <PickCard key={`${influencer.id}-${pick.id}-${index}`} pick={pick} influencer={influencer} />
          ))}

          {/* View all curators card */}
          <Link href="/influencers">
            <div className="flex-shrink-0 w-48 h-full min-h-[180px] rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col items-center justify-center gap-2 transition hover:border-emerald-500 hover:bg-emerald-100/50">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-700">Browse all curators</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
