"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, ItemType } from "@prisma/client";
import { CATEGORY_COLORS } from "@/lib/constants/categories";

interface InfluencerPick {
  id: string;
  title: string;
  type: ItemType;
  category: Category;
  venueName: string;
  reason: string;
}

interface Influencer {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  profileImageUrl: string | null;
  followerCount: number;
  isFollowed: boolean;
  latestPicks: InfluencerPick[];
}

interface InfluencerCardProps {
  influencer: Influencer;
  onFollow: (id: string) => void;
  followLoading: string | null;
}

function InfluencerCard({ influencer, onFollow, followLoading }: InfluencerCardProps) {
  return (
    <div className="flex-shrink-0 w-72 card">
      {/* Header with avatar and info */}
      <Link href={`/influencers/${influencer.handle}`} className="flex items-start gap-3 mb-3">
        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
          {influencer.profileImageUrl ? (
            <Image
              src={influencer.profileImageUrl}
              alt={influencer.displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xl font-bold">
              {influencer.displayName[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 truncate hover:text-primary transition">
            {influencer.displayName}
          </h4>
          <p className="text-xs text-slate-500">@{influencer.handle}</p>
          <p className="text-xs text-slate-400">
            {influencer.followerCount} follower{influencer.followerCount !== 1 ? "s" : ""}
          </p>
        </div>
      </Link>

      {/* Latest picks */}
      {influencer.latestPicks.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Top picks
          </p>
          <div className="space-y-1.5">
            {influencer.latestPicks.slice(0, 3).map((pick) => (
              <Link
                key={pick.id}
                href={pick.type === "PLACE" ? `/places/${pick.id}` : `/items/${pick.id}`}
                className="block group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[pick.category]}`}
                  >
                    {pick.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-slate-700 truncate group-hover:text-primary transition">
                    {pick.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onFollow(influencer.id)}
          disabled={followLoading === influencer.id}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            influencer.isFollowed
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-primary text-white hover:bg-primary/90"
          } ${followLoading === influencer.id ? "opacity-50" : ""}`}
        >
          {followLoading === influencer.id
            ? "..."
            : influencer.isFollowed
              ? "Following"
              : "Follow"}
        </button>
        <Link
          href={`/influencers/${influencer.handle}`}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          View
        </Link>
      </div>
    </div>
  );
}

export default function InfluencerPicksSection() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchInfluencers() {
      try {
        const response = await fetch("/api/influencers");
        if (response.ok) {
          const data = await response.json();
          // Prioritize influencers the user doesn't follow yet
          const sorted = [...data.influencers].sort((a, b) => {
            if (a.isFollowed !== b.isFollowed) {
              return a.isFollowed ? 1 : -1;
            }
            return b.followerCount - a.followerCount;
          });
          // Show up to 3 influencers
          setInfluencers(sorted.slice(0, 3));
        }
      } catch {
        /* silently handled */
      } finally {
        setLoading(false);
      }
    }

    fetchInfluencers();
  }, []);

  const handleFollow = async (influencerId: string) => {
    setFollowLoading(influencerId);
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId }),
      });

      if (response.ok) {
        const { followed } = await response.json();
        setInfluencers((prev) =>
          prev.map((inf) =>
            inf.id === influencerId
              ? {
                  ...inf,
                  isFollowed: followed,
                  followerCount: inf.followerCount + (followed ? 1 : -1),
                }
              : inf
          )
        );
      }
    } catch {
      /* silently handled */
    } finally {
      setFollowLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm text-slate-600">Loading curators...</span>
        </div>
      </div>
    );
  }

  if (influencers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2">
            <svg
              className="h-5 w-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              From People You Might Like
            </h2>
            <p className="text-sm text-slate-600">
              Denver curators with great taste
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/influencers"
            className="text-sm text-indigo-600 hover:underline"
          >
            See all
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

      {/* Influencer Cards */}
      {!collapsed && (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {influencers.map((influencer) => (
            <InfluencerCard
              key={influencer.id}
              influencer={influencer}
              onFollow={handleFollow}
              followLoading={followLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
