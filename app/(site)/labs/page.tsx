"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LabsItemCard from "@/components/labs/LabsItemCard";

type LabsItemType = "COWORKING_SESSION" | "STARTUP_EVENT" | "BUILDER_MEETUP" | "GET_INVOLVED" | "WORKSHOP";

type TabType = "ALL" | LabsItemType;

const TABS: { value: TabType; label: string; emoji: string }[] = [
  { value: "ALL", label: "All", emoji: "✨" },
  { value: "COWORKING_SESSION", label: "Coworking", emoji: "💻" },
  { value: "STARTUP_EVENT", label: "Startup Events", emoji: "🚀" },
  { value: "BUILDER_MEETUP", label: "Builder Meetups", emoji: "🔨" },
  { value: "GET_INVOLVED", label: "Get Involved", emoji: "🤝" },
  { value: "WORKSHOP", label: "Workshops", emoji: "📚" },
];

type LabsItem = {
  id: string;
  title: string;
  description: string | null;
  type: LabsItemType;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  address: string | null;
  neighborhood: string | null;
  isVirtual: boolean;
  virtualLink: string | null;
  tags: string[];
  imageUrl: string | null;
  hostName: string | null;
  hostImageUrl: string | null;
  capacity: number | null;
  spotsLeft: number | null;
  status: string;
  rsvpCount: number;
  saveCount: number;
  userRSVP: { status: string } | null;
  userSave: { id: string } | null;
};

type Stats = {
  rsvpCount: number;
  saveCount: number;
  attendedCount: number;
};

export default function LabsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [items, setItems] = useState<LabsItem[]>([]);
  const [stats, setStats] = useState<Stats>({ rsvpCount: 0, saveCount: 0, attendedCount: 0 });
  const [loading, setLoading] = useState(true);

  // Check admin access
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
    }
  }, [session, status, router]);

  // Fetch items and stats
  useEffect(() => {
    if (!session?.user?.isAdmin) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [itemsRes, statsRes] = await Promise.all([
          fetch(`/api/labs${activeTab !== "ALL" ? `?type=${activeTab}` : ""}`),
          fetch("/api/labs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stats" }),
          }),
        ]);

        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setItems(data);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch labs data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab, session?.user?.isAdmin]);

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const myRSVPs = items.filter((item) => item.userRSVP?.status === "GOING");
  const mySaved = items.filter((item) => item.userSave);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pulse Labs</h1>
            <p className="text-slate-500">
              Exclusive community for Denver builders and creators
            </p>
          </div>
          <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
            Beta
          </span>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab.value
                    ? "bg-purple-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"
                >
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No events yet
              </h3>
              <p className="text-slate-500">
                Check back soon for coworking sessions, meetups, and more!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <LabsItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-80 shrink-0">
          {/* Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h3 className="font-semibold text-slate-900 mb-3">Your Stats</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {stats.rsvpCount}
                </div>
                <div className="text-xs text-purple-600">RSVPs</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">
                  {stats.saveCount}
                </div>
                <div className="text-xs text-amber-600">Saved</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {stats.attendedCount}
                </div>
                <div className="text-xs text-green-600">Attended</div>
              </div>
            </div>
          </div>

          {/* My RSVPs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <h3 className="font-semibold text-slate-900 mb-3">
              My RSVPs ({myRSVPs.length})
            </h3>
            {myRSVPs.length === 0 ? (
              <p className="text-sm text-slate-500">
                No RSVPs yet. Find something exciting!
              </p>
            ) : (
              <div className="space-y-2">
                {myRSVPs.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-purple-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-slate-900 truncate">
                      {item.title}
                    </div>
                    {item.startTime && (
                      <div className="text-xs text-slate-500">
                        {new Date(item.startTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {myRSVPs.length > 3 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{myRSVPs.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Saved Items */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">
              Saved ({mySaved.length})
            </h3>
            {mySaved.length === 0 ? (
              <p className="text-sm text-slate-500">
                Save items to check out later.
              </p>
            ) : (
              <div className="space-y-2">
                {mySaved.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-amber-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-slate-900 truncate">
                      {item.title}
                    </div>
                    {item.startTime && (
                      <div className="text-xs text-slate-500">
                        {new Date(item.startTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {mySaved.length > 3 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{mySaved.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
