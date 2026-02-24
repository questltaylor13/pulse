"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";

interface TrendingEvent {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  neighborhood: string | null;
  saveCount: number;
}

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  profileImageUrl: string | null;
  bio: string;
  followersCount: number;
  isFollowed?: boolean;
}

interface ActiveFilter {
  type: "category" | "neighborhood" | "subcategory" | "lifestyle";
  value: string;
  label: string;
}

interface FeedSidebarProps {
  activeFilters?: ActiveFilter[];
  onClearFilters?: () => void;
}

const NEIGHBORHOODS = [
  "RiNo",
  "LoDo",
  "LoHi",
  "Capitol Hill",
  "Cherry Creek",
  "Highlands",
  "Five Points",
  "Baker",
];

export default function FeedSidebar({
  activeFilters = [],
  onClearFilters,
}: FeedSidebarProps) {
  const [trending, setTrending] = useState<TrendingEvent[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      const [trendingRes, creatorsRes] = await Promise.all([
        fetch("/api/trending?limit=5"),
        fetch("/api/influencers?limit=4"),
      ]);

      if (trendingRes.ok) {
        const data = await trendingRes.json();
        setTrending(data.events?.slice(0, 5) || []);
      }

      if (creatorsRes.ok) {
        const data = await creatorsRes.json();
        // Prioritize influencers the user doesn't follow yet
        const sorted = [...(data.influencers || [])].sort((a: Creator, b: Creator) => {
          if (a.isFollowed !== b.isFollowed) {
            return a.isFollowed ? 1 : -1;
          }
          return (b.followersCount || 0) - (a.followersCount || 0);
        });
        setCreators(sorted.slice(0, 4));
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (creatorId: string) => {
    setFollowLoading(creatorId);
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId: creatorId }),
      });

      if (response.ok) {
        const { followed } = await response.json();
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creatorId
              ? { ...c, isFollowed: followed, followersCount: c.followersCount + (followed ? 1 : -1) }
              : c
          )
        );
      }
    } catch {
      /* silently handled */
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Filters Summary */}
      {/* Curators You Might Like - Featured prominently at top */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <span>✨</span>
            People You Might Like
          </h3>
          <Link
            href="/influencers"
            className="text-xs text-indigo-600 hover:underline"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-3 w-1/2 rounded bg-slate-200 mb-1" />
                  <div className="h-2 w-3/4 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : creators.length > 0 ? (
          <div className="space-y-3">
            {creators.map((creator) => (
              <div
                key={creator.id}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/50 transition"
              >
                <Link
                  href={`/influencers/${creator.handle}`}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 overflow-hidden"
                >
                  {creator.profileImageUrl ? (
                    <Image
                      src={creator.profileImageUrl}
                      alt={creator.displayName}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 font-medium">
                      {creator.displayName.charAt(0)}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/influencers/${creator.handle}`}
                    className="text-sm font-medium text-slate-900 hover:text-primary transition block truncate"
                  >
                    {creator.displayName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    @{creator.handle} · {creator.followersCount} followers
                  </p>
                </div>
                <button
                  onClick={() => handleFollow(creator.id)}
                  disabled={followLoading === creator.id}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
                    creator.isFollowed
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  } ${followLoading === creator.id ? "opacity-50" : ""}`}
                >
                  {followLoading === creator.id
                    ? "..."
                    : creator.isFollowed
                      ? "Following"
                      : "Follow"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No creators found</p>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFilters.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 text-sm">Active Filters</h3>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, idx) => (
              <span
                key={`${filter.type}-${filter.value}-${idx}`}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
              >
                {filter.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trending This Week */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-orange-500">🔥</span>
          Trending This Week
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="flex-1">
                  <div className="h-3 w-3/4 rounded bg-slate-200 mb-1" />
                  <div className="h-2 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : trending.length > 0 ? (
          <div className="space-y-3">
            {trending.map((event, idx) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition group"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-1 group-hover:text-primary transition">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.venueName}
                    {event.saveCount > 0 && (
                      <span className="text-orange-600 ml-1">
                        · {event.saveCount} going
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No trending events</p>
        )}

        <Link
          href="/feed?sort=trending"
          className="block mt-3 pt-3 border-t border-slate-100 text-sm text-primary hover:text-primary/80 font-medium"
        >
          See all trending →
        </Link>
      </div>

      {/* Neighborhoods to Explore */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span>📍</span>
          Explore by Neighborhood
        </h3>
        <div className="flex flex-wrap gap-2">
          {NEIGHBORHOODS.map((hood) => (
            <Link
              key={hood}
              href={`/feed?neighborhood=${encodeURIComponent(hood)}`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-primary/10 hover:text-primary rounded-full text-xs font-medium text-slate-600 transition"
            >
              {hood}
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="card bg-gradient-to-br from-primary/5 to-purple-50">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Links</h3>
        <div className="space-y-2">
          <Link
            href="/lists/want"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
          >
            <span>✨</span>
            Your Want List
          </Link>
          <Link
            href="/lists/done"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
          >
            <span>✓</span>
            Completed
          </Link>
          <Link
            href="/community"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
          >
            <span>👥</span>
            Community
          </Link>
        </div>
      </div>
    </div>
  );
}
