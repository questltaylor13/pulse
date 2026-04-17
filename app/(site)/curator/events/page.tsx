"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface CuratorEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  venueName: string;
  neighborhood: string | null;
  startTime: string;
  endTime: string | null;
  priceRange: string;
  status: string;
  coverImage: string | null;
  saves: number;
  isHost: boolean;
  quote: string | null;
  isFeatured: boolean;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "drafts", label: "Drafts" },
];

function CuratorEventsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CuratorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchEvents();
    }
  }, [status, router, activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/curator/events?tab=${activeTab}`);
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          router.push("/curator");
        }
        return;
      }

      setEvents(json.events);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch(`/api/curator/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(events.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/curator" className="text-sm text-primary hover:underline mb-1 inline-block">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">My Events</h1>
            </div>
            <Link
              href="/curator/events/new"
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-dark transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Event
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === tab.key
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No events yet</h3>
            <p className="text-slate-500 mb-6">
              {activeTab === "drafts"
                ? "You don't have any draft events."
                : "Start sharing events you recommend or are hosting!"}
            </p>
            <Link
              href="/curator/events/new"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-primary/30 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        event.status === "PUBLISHED"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {event.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                      {event.isHost && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          Hosting
                        </span>
                      )}
                      {event.isFeatured && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          Featured
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{event.title}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.startTime)} at {formatTime(event.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {event.venueName}
                      </span>
                      {event.neighborhood && (
                        <span>{event.neighborhood}</span>
                      )}
                    </div>

                    {event.quote && (
                      <p className="mt-2 text-sm text-slate-600 italic">"{event.quote}"</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-slate-900">{event.saves}</div>
                    <div className="text-xs text-slate-500">saves</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Link
                    href={`/curator/events/${event.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                  <Link
                    href={`/events/${event.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition ml-auto"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CuratorEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <CuratorEventsContent />
    </Suspense>
  );
}
