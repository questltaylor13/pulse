"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  profileColor: string | null;
  isFounder: boolean;
  isDenverNative: boolean;
  yearsInDenver: number | null;
  specialties: string[];
  followerCount: number;
  isFollowed: boolean;
  latestPicks: InfluencerPick[];
}

export default function InfluencersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (!session.user.onboardingComplete) {
      router.push("/onboarding");
      return;
    }

    fetchInfluencers();
  }, [session, status, router]);

  const fetchInfluencers = async () => {
    try {
      const response = await fetch("/api/influencers");
      if (response.ok) {
        const data = await response.json();
        setInfluencers(data.influencers);
      }
    } catch (error) {
      console.error("Failed to fetch influencers:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Denver Curators</h1>
          <p className="text-slate-600">
            Follow local tastemakers for curated picks
          </p>
        </div>
        <Link
          href="/feed"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Back to Feed
        </Link>
      </div>

      {/* Influencer Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {influencers.map((influencer) => (
          <div
            key={influencer.id}
            className="card overflow-hidden"
            style={{
              background: influencer.profileColor
                ? `linear-gradient(135deg, ${influencer.profileColor} 0%, white 100%)`
                : undefined
            }}
          >
            {/* Header with avatar */}
            <div className="flex items-start gap-4 mb-4">
              <Link href={`/influencers/${influencer.handle}`}>
                <div className="relative h-20 w-20 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-4 ring-white shadow-lg">
                  {influencer.profileImageUrl ? (
                    <Image
                      src={influencer.profileImageUrl}
                      alt={influencer.displayName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 text-2xl font-bold">
                      {influencer.displayName[0]}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/influencers/${influencer.handle}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate hover:text-primary transition">
                      {influencer.displayName}
                    </h3>
                    {influencer.isFounder && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Founder
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">@{influencer.handle}</p>
                </Link>
                <p className="text-xs text-slate-500 mt-1">
                  {influencer.isDenverNative ? (
                    <span>🏔️ Denver Native</span>
                  ) : influencer.yearsInDenver ? (
                    <span>📍 {influencer.yearsInDenver} years in Denver</span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
              {influencer.bio}
            </p>

            {/* Specialties */}
            {influencer.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {influencer.specialties.slice(0, 4).map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-block rounded-full bg-white/80 border border-slate-200 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}

            {/* Latest picks preview */}
            {influencer.latestPicks.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Latest picks
                </p>
                <div className="space-y-1">
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
                onClick={() => handleFollow(influencer.id)}
                disabled={followLoading === influencer.id}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
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
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && influencers.length === 0 && (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No curators yet</h3>
          <p className="text-slate-600">
            Check back soon for Denver&apos;s top tastemakers!
          </p>
        </div>
      )}
    </div>
  );
}
