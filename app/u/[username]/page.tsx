"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Category, BadgeTier, GroupRole } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";

interface PublicList {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  itemCount: number;
  shareSlug: string | null;
  updatedAt: string;
}

interface ProfileStats {
  eventsSaved: number;
  eventsAttended: number;
  topCategories: { name: string; count: number }[];
  topNeighborhoods: { name: string; count: number }[];
}

interface ProfileBadge {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  tier: BadgeTier;
  colorHex: string;
  earnedAt: string | null;
  isPinned: boolean;
}

interface ProfileGroup {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  role: GroupRole;
  members: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
  }[];
}

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  stats: ProfileStats;
  publicLists: PublicList[];
  // Community features
  currentStreak: number;
  longestStreak: number;
  totalBadgesEarned: number;
  rank: number | null;
  score: number;
  badges: ProfileBadge[];
  groups: ProfileGroup[];
}

const TIER_COLORS: Record<BadgeTier, string> = {
  BRONZE: "border-amber-600 bg-amber-50",
  SILVER: "border-slate-400 bg-slate-50",
  GOLD: "border-yellow-500 bg-yellow-50",
  PLATINUM: "border-purple-500 bg-purple-50",
};

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/users/${username}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            throw new Error("Failed to fetch profile");
          }
          return;
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    if (!profile || !session) return;

    setFollowLoading(true);
    try {
      const response = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });

      if (response.ok) {
        const { following } = await response.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: following,
                followerCount: prev.followerCount + (following ? 1 : -1),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {error || "User not found"}
        </h2>
        <p className="text-slate-600 mb-4">
          This profile doesn&apos;t exist or may have been removed.
        </p>
        <Link href="/feed" className="btn-primary">
          Go to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative h-24 w-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
            {profile.profileImageUrl ? (
              profile.profileImageUrl.startsWith("http") ? (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.name || profile.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={profile.profileImageUrl}
                  alt={profile.name || profile.username}
                  fill
                  className="object-cover"
                />
              )
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-4xl font-bold">
                {(profile.name || profile.username)[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {profile.name || `@${profile.username}`}
              </h1>
              {profile.isInfluencer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Verified Curator
                </span>
              )}
            </div>
            {profile.name && (
              <p className="text-slate-500 mb-2">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-slate-600 mb-4">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {profile.stats.eventsAttended}
                </div>
                <div className="text-xs text-slate-500">Events</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {profile.totalBadgesEarned}
                </div>
                <div className="text-xs text-slate-500">Badges</div>
              </div>
              {profile.currentStreak > 0 && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">
                    {profile.currentStreak}w
                  </div>
                  <div className="text-xs text-slate-500">Streak</div>
                </div>
              )}
              {profile.rank && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">
                    #{profile.rank}
                  </div>
                  <div className="text-xs text-slate-500">Rank</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {profile.followerCount}
                </div>
                <div className="text-xs text-slate-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {profile.followingCount}
                </div>
                <div className="text-xs text-slate-500">Following</div>
              </div>
            </div>

            {/* Actions */}
            {!profile.isOwnProfile && session && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`rounded-md px-6 py-2 text-sm font-medium transition ${
                  profile.isFollowing
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-primary text-white hover:bg-primary/90"
                } ${followLoading ? "opacity-50" : ""}`}
              >
                {followLoading
                  ? "..."
                  : profile.isFollowing
                    ? "Following"
                    : "Follow"}
              </button>
            )}
            {profile.isOwnProfile && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/settings/profile"
                  className="inline-block rounded-md bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  My Calendar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {profile.badges.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Badges</h2>
            {profile.isOwnProfile && (
              <Link
                href="/community/badges"
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                View All ({profile.totalBadgesEarned})
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-2 rounded-full px-3 py-2 border-2 ${TIER_COLORS[badge.tier]}`}
                title={badge.name}
              >
                <span className="text-xl">{badge.emoji}</span>
                <span className="text-sm font-medium text-slate-700">
                  {badge.name}
                </span>
                {badge.isPinned && (
                  <svg
                    className="w-3 h-3 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Section (own profile only) */}
      {profile.isOwnProfile && profile.groups.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Your Groups</h2>
            <Link
              href="/groups"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              View All
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl">
                  {group.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{group.name}</p>
                  <p className="text-xs text-slate-500">{group.memberCount} members</p>
                </div>
                {group.role === GroupRole.OWNER && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Owner
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories & Neighborhoods */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Top Categories */}
        {profile.stats.topCategories.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Top Categories</h3>
            <div className="space-y-2">
              {profile.stats.topCategories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {CATEGORY_LABELS[cat.name as Category] || cat.name}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Neighborhoods */}
        {profile.stats.topNeighborhoods.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-3">Top Neighborhoods</h3>
            <div className="space-y-2">
              {profile.stats.topNeighborhoods.map((hood) => (
                <div key={hood.name} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{hood.name}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {hood.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Public Lists */}
      {profile.publicLists.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Public Lists
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.publicLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="card hover:shadow-md transition"
              >
                {list.coverImageUrl && (
                  <div className="relative h-32 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl">
                    <Image
                      src={list.coverImageUrl}
                      alt={list.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-slate-900 mb-1">{list.name}</h3>
                {list.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {list.description}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {list.itemCount} event{list.itemCount !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {profile.publicLists.length === 0 && !profile.isOwnProfile && (
        <div className="card text-center py-8">
          <p className="text-slate-500">
            {profile.name || `@${profile.username}`} hasn&apos;t created any public lists yet.
          </p>
        </div>
      )}
    </div>
  );
}
