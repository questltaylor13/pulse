"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface CuratorData {
  isCreator: boolean;
  influencer: {
    id: string;
    handle: string;
    displayName: string;
    profileImageUrl: string | null;
    profileColor: string | null;
  };
  stats: {
    eventsCreated: number;
    totalSaves: number;
    followerCount: number;
  };
  recentEvents: {
    id: string;
    title: string;
    startTime: string;
    status: string;
    saves: number;
  }[];
  recentActivity: {
    type: string;
    eventTitle: string;
    createdAt: string;
  }[];
}

export default function CuratorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<CuratorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchCuratorData();
    }
  }, [status, router]);

  const fetchCuratorData = async () => {
    try {
      const res = await fetch("/api/curator");
      const json = await res.json();

      if (!res.ok) {
        if (json.isCreator === false) {
          setError("not_creator");
        } else {
          setError(json.error || "Failed to load dashboard");
        }
        return;
      }

      setData(json);
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error === "not_creator") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Creator Access Required</h1>
          <p className="text-slate-600 mb-6">
            This area is for Pulse creators. Want to become a creator and share your Denver discoveries?
          </p>
          <Link
            href="/influencers"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Learn About Creators
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchCuratorData} className="text-primary hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            {data.influencer.profileImageUrl ? (
              <Image
                src={data.influencer.profileImageUrl}
                alt={data.influencer.displayName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: data.influencer.profileColor || "#2563eb" }}
              >
                {data.influencer.displayName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Hey, {data.influencer.displayName}!
              </h1>
              <Link
                href={`/influencers/${data.influencer.handle}`}
                className="text-sm text-primary hover:underline"
              >
                View Public Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="text-3xl font-bold text-slate-900">{data.stats.eventsCreated}</div>
            <div className="text-sm text-slate-500">Events Created</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="text-3xl font-bold text-slate-900">{data.stats.totalSaves}</div>
            <div className="text-sm text-slate-500">Total Saves</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="text-3xl font-bold text-slate-900">{data.stats.followerCount}</div>
            <div className="text-sm text-slate-500">Followers</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/curator/events/new"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add an Event
            </Link>
            <Link
              href="/curator/events"
              className="inline-flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50 transition"
            >
              View My Events
            </Link>
            <Link
              href={`/influencers/${data.influencer.handle}`}
              className="inline-flex items-center gap-2 bg-white text-slate-700 px-6 py-3 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50 transition"
            >
              Edit My Profile
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Events */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Events</h2>
              <Link href="/curator/events" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            {data.recentEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">No events yet. Create your first one!</p>
            ) : (
              <div className="space-y-3">
                {data.recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/curator/events/${event.id}/edit`}
                    className="block p-3 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{event.title}</div>
                        <div className="text-sm text-slate-500">
                          {new Date(event.startTime).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          event.status === "PUBLISHED"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {event.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                        <div className="text-sm text-slate-500 mt-1">{event.saves} saves</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-slate-500 text-sm">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">{activity.eventTitle}</span> was saved
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
