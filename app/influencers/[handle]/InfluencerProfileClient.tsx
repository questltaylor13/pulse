"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category, ItemType, PickSetRange } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";

interface ItemData {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  startTime: Date | null;
  priceRange: string;
  neighborhood: string | null;
}

interface Pick {
  id: string;
  rank: number;
  reason: string;
  item: ItemData;
}

interface PickSet {
  id: string;
  range: PickSetRange;
  title: string;
  summaryText: string | null;
  generatedAt: Date;
  picks: Pick[];
}

interface EventFeature {
  id: string;
  quote: string | null;
  isHost: boolean;
  isFeatured: boolean;
  event: {
    id: string;
    title: string;
    description: string;
    category: Category;
    venueName: string;
    address: string;
    neighborhood: string | null;
    startTime: Date;
    endTime: Date | null;
    priceRange: string;
    imageUrl: string | null;
  };
}

interface InfluencerData {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  profileImageUrl: string | null;
  profileColor: string | null;
  instagram: string | null;
  tiktok: string | null;
  isDenverNative: boolean;
  yearsInDenver: number | null;
  isFounder: boolean;
  vibeDescription: string | null;
  funFacts: string[];
  specialties: string[];
  preferredCategories: Category[];
  followerCount: number;
  isFollowed: boolean;
  pickSets: PickSet[];
  eventFeatures: EventFeature[];
}

interface InfluencerProfileClientProps {
  influencer: InfluencerData;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function InfluencerProfileClient({
  influencer,
}: InfluencerProfileClientProps) {
  const [isFollowed, setIsFollowed] = useState(influencer.isFollowed);
  const [followerCount, setFollowerCount] = useState(influencer.followerCount);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PickSetRange>("WEEK");

  const weeklySet = influencer.pickSets.find((s) => s.range === "WEEK");
  const monthlySet = influencer.pickSets.find((s) => s.range === "MONTH");
  const activeSet = activeTab === "WEEK" ? weeklySet : monthlySet;

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const response = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId: influencer.id }),
      });

      if (response.ok) {
        const { followed } = await response.json();
        setIsFollowed(followed);
        setFollowerCount((prev) => prev + (followed ? 1 : -1));
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/influencers" className="hover:text-primary">
          Curators
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">@{influencer.handle}</span>
      </nav>

      {/* Profile Header */}
      <div
        className="card overflow-hidden"
        style={{
          background: influencer.profileColor
            ? `linear-gradient(135deg, ${influencer.profileColor} 0%, white 100%)`
            : undefined
        }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative h-32 w-32 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-4 ring-white shadow-lg">
            {influencer.profileImageUrl ? (
              <Image
                src={influencer.profileImageUrl}
                alt={influencer.displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-4xl font-bold">
                {influencer.displayName[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {influencer.displayName}
              </h1>
              {influencer.isFounder && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Founder
                </span>
              )}
            </div>
            <p className="text-slate-500 mb-1">@{influencer.handle}</p>

            {/* Denver status */}
            <p className="text-sm text-slate-500 mb-3">
              {influencer.isDenverNative ? (
                <span className="inline-flex items-center gap-1">
                  <span>🏔️</span> Denver Native
                </span>
              ) : influencer.yearsInDenver ? (
                <span className="inline-flex items-center gap-1">
                  <span>📍</span> {influencer.yearsInDenver} years in Denver
                </span>
              ) : null}
            </p>

            <p className="text-slate-600 mb-4 whitespace-pre-line">{influencer.bio}</p>

            {/* Specialties */}
            {influencer.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {influencer.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-block rounded-full bg-white/80 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}

            {/* Social Links */}
            {(influencer.instagram || influencer.tiktok) && (
              <div className="flex gap-3 mb-4">
                {influencer.instagram && (
                  <a
                    href={`https://instagram.com/${influencer.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </a>
                )}
                {influencer.tiktok && (
                  <a
                    href={`https://tiktok.com/@${influencer.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                    TikTok
                  </a>
                )}
              </div>
            )}

            {/* Stats & Follow */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {followerCount} follower{followerCount !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`rounded-md px-6 py-2 text-sm font-medium transition ${
                  isFollowed
                    ? "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                    : "bg-primary text-white hover:bg-primary/90"
                } ${followLoading ? "opacity-50" : ""}`}
              >
                {followLoading ? "..." : isFollowed ? "Following" : "Follow"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fun Facts */}
      {influencer.funFacts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Fun Facts</h2>
          <div className="space-y-3">
            {influencer.funFacts.map((fact, index) => (
              <div key={index} className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="text-slate-600">{fact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hosted/Featured Events */}
      {influencer.eventFeatures.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {influencer.eventFeatures.some(f => f.isHost) ? "Events I'm Hosting" : "Events I'm Featuring"}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Creator Pick
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {influencer.eventFeatures.map((feature) => (
              <Link
                key={feature.id}
                href={`/events/${feature.event.id}`}
                className="card group overflow-hidden hover:shadow-md transition"
              >
                {/* Event Image */}
                {feature.event.imageUrl && (
                  <div className="relative h-40 -mx-4 -mt-4 mb-4">
                    <Image
                      src={feature.event.imageUrl}
                      alt={feature.event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {feature.isHost && (
                      <span className="absolute top-2 right-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-medium text-white">
                        Hosting
                      </span>
                    )}
                  </div>
                )}

                {/* Category & Date */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[feature.event.category]}`}>
                    {CATEGORY_LABELS[feature.event.category]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDate(feature.event.startTime)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-primary transition line-clamp-2">
                  {feature.event.title}
                </h3>

                {/* Quote */}
                <p className="text-sm text-primary font-medium mb-3 italic line-clamp-2">
                  &ldquo;{feature.quote}&rdquo;
                </p>

                {/* Venue & Price */}
                <div className="text-sm text-slate-500 space-y-1">
                  <p className="line-clamp-1">{feature.event.venueName}</p>
                  <div className="flex items-center gap-2">
                    {feature.event.neighborhood && (
                      <span className="text-slate-400">{feature.event.neighborhood}</span>
                    )}
                    <span>{feature.event.priceRange}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("WEEK")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === "WEEK"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            This Week ({weeklySet?.picks.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("MONTH")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === "MONTH"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            This Month ({monthlySet?.picks.length || 0})
          </button>
        </div>
      </div>

      {/* Pick Set Content */}
      {activeSet ? (
        <div className="space-y-6">
          {/* Set header */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{activeSet.title}</h2>
            {activeSet.summaryText && (
              <p className="text-slate-600 mt-1">{activeSet.summaryText}</p>
            )}
          </div>

          {/* Picks grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeSet.picks.map((pick) => (
              <Link
                key={pick.id}
                href={
                  pick.item.type === "PLACE"
                    ? `/places/${pick.item.id}`
                    : `/items/${pick.item.id}`
                }
                className="card group hover:shadow-md transition"
              >
                {/* Rank badge */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_COLORS[pick.item.category]}`}
                  >
                    {CATEGORY_LABELS[pick.item.category]}
                  </span>
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                    #{pick.rank}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary transition line-clamp-2">
                  {pick.item.title}
                </h3>

                {/* Curator's reason */}
                <p className="text-sm text-primary font-medium mb-2">
                  &ldquo;{pick.reason}&rdquo;
                </p>

                {/* Details */}
                <div className="text-sm text-slate-500 space-y-1">
                  {pick.item.type === "EVENT" && pick.item.startTime && (
                    <p>{formatDate(pick.item.startTime)}</p>
                  )}
                  <p className="line-clamp-1">{pick.item.venueName}</p>
                  {pick.item.neighborhood && (
                    <p className="text-slate-400">{pick.item.neighborhood}</p>
                  )}
                  <p>{pick.item.priceRange}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-slate-500">
            No {activeTab === "WEEK" ? "weekly" : "monthly"} picks available yet.
          </p>
        </div>
      )}
    </div>
  );
}
