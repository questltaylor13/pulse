"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";

interface ActivityUser {
  id: string;
  username: string | null;
  name: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
}

interface ActivityEvent {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  startTime: string;
}

interface ActivityList {
  id: string;
  name: string;
}

interface ActivityTargetUser {
  id: string;
  username: string | null;
  name: string | null;
}

interface Activity {
  id: string;
  type: string;
  user: ActivityUser;
  event: ActivityEvent | null;
  list: ActivityList | null;
  targetUser: ActivityTargetUser | null;
  createdAt: string;
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

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getActivityText(activity: Activity): React.ReactNode {
  const userName = activity.user.name || `@${activity.user.username}`;

  switch (activity.type) {
    case "SAVED_EVENT":
      return (
        <>
          <span className="font-medium">{userName}</span> saved{" "}
          {activity.event && (
            <Link href={`/events/${activity.event.id}`} className="font-medium text-primary hover:underline">
              {activity.event.title}
            </Link>
          )}
        </>
      );
    case "ATTENDED_EVENT":
      return (
        <>
          <span className="font-medium">{userName}</span> attended{" "}
          {activity.event && (
            <Link href={`/events/${activity.event.id}`} className="font-medium text-primary hover:underline">
              {activity.event.title}
            </Link>
          )}
        </>
      );
    case "CREATED_LIST":
      return (
        <>
          <span className="font-medium">{userName}</span> created a new list{" "}
          {activity.list && (
            <Link href={`/lists/${activity.list.id}`} className="font-medium text-primary hover:underline">
              {activity.list.name}
            </Link>
          )}
        </>
      );
    case "ADDED_TO_LIST":
      return (
        <>
          <span className="font-medium">{userName}</span> added{" "}
          {activity.event && (
            <Link href={`/events/${activity.event.id}`} className="font-medium text-primary hover:underline">
              {activity.event.title}
            </Link>
          )}{" "}
          to{" "}
          {activity.list && (
            <Link href={`/lists/${activity.list.id}`} className="font-medium text-primary hover:underline">
              {activity.list.name}
            </Link>
          )}
        </>
      );
    case "FOLLOWED_USER":
      return (
        <>
          <span className="font-medium">{userName}</span> started following{" "}
          {activity.targetUser && (
            <Link
              href={activity.targetUser.username ? `/u/${activity.targetUser.username}` : "#"}
              className="font-medium text-primary hover:underline"
            >
              {activity.targetUser.name || `@${activity.targetUser.username}`}
            </Link>
          )}
        </>
      );
    case "RATED_PLACE":
      return (
        <>
          <span className="font-medium">{userName}</span> rated a place
        </>
      );
    default:
      return <span className="font-medium">{userName}</span>;
  }
}

function getActivityIcon(type: string): React.ReactNode {
  switch (type) {
    case "SAVED_EVENT":
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      );
    case "ATTENDED_EVENT":
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "CREATED_LIST":
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    case "ADDED_TO_LIST":
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      );
    case "FOLLOWED_USER":
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      );
  }
}

export default function FollowingFeedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  const fetchActivities = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/feed/following?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (cursor) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities);
        }
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || !session) return;
    fetchActivities();
  }, [fetchActivities, session, status]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchActivities(nextCursor);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Following</h1>
          <p className="text-slate-600">Activity from people you follow</p>
        </div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Discover
        </Link>
      </div>

      {/* Activity Feed */}
      {loading && activities.length === 0 ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 rounded bg-slate-200 mb-2" />
                  <div className="h-3 w-1/4 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No activity yet</h3>
          <p className="text-slate-600 mb-4">
            Follow some curators to see their activity here.
          </p>
          <Link href="/influencers" className="btn-primary">
            Find Curators to Follow
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="card">
              <div className="flex items-start gap-3">
                {/* User Avatar */}
                <Link
                  href={activity.user.username ? `/u/${activity.user.username}` : "#"}
                  className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0"
                >
                  {activity.user.profileImageUrl ? (
                    <Image
                      src={activity.user.profileImageUrl}
                      alt={activity.user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                      {(activity.user.name || activity.user.username || "U")[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  {/* Activity Text */}
                  <p className="text-sm text-slate-700">
                    {getActivityText(activity)}
                    {activity.user.isInfluencer && (
                      <svg className="inline h-3 w-3 ml-1 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </p>

                  {/* Event Preview */}
                  {activity.event && (
                    <Link
                      href={`/events/${activity.event.id}`}
                      className="mt-2 block rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[activity.event.category]}`}>
                          {activity.event.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-900 text-sm">{activity.event.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{activity.event.venueName}</p>
                    </Link>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <span className="text-slate-300">{getActivityIcon(activity.type)}</span>
                    <span>{formatTimeAgo(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
