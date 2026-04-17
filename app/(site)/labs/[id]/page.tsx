"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type LabsItemType = "COWORKING_SESSION" | "STARTUP_EVENT" | "BUILDER_MEETUP" | "GET_INVOLVED" | "WORKSHOP";

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

const TYPE_CONFIG: Record<
  LabsItemType,
  { label: string; color: string; bgColor: string; emoji: string }
> = {
  COWORKING_SESSION: {
    label: "Coworking",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    emoji: "💻",
  },
  STARTUP_EVENT: {
    label: "Startup Event",
    color: "text-green-700",
    bgColor: "bg-green-100",
    emoji: "🚀",
  },
  BUILDER_MEETUP: {
    label: "Builder Meetup",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    emoji: "🔨",
  },
  GET_INVOLVED: {
    label: "Get Involved",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    emoji: "🤝",
  },
  WORKSHOP: {
    label: "Workshop",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    emoji: "📚",
  },
};

// Fake detailed content for items
const DETAILED_CONTENT: Record<string, { about: string; whatToExpect: string[]; whoShouldJoin: string[]; externalUrl?: string }> = {
  "Nuro Beta Testers Wanted": {
    about: `Nuro is a voice-first journaling app designed for people who think while they move. Whether you're on a walk, driving, or just pacing around your apartment, Nuro captures your thoughts naturally through voice and uses AI to help you make sense of them later.

We're building this for people with ADHD, busy professionals who take walking meetings, athletes who process during runs, or anyone who finds sitting down to journal impossible.

As a beta tester, you'll get early access to the app and direct influence on what we build next. We're a small team and every piece of feedback matters.`,
    whatToExpect: [
      "Early access to the Nuro iOS app",
      "Direct Slack channel with the founding team",
      "Weekly feedback sessions (optional)",
      "Free premium access for life if you stick with us",
    ],
    whoShouldJoin: [
      "People with ADHD who struggle with traditional journaling",
      "Those who take walking meetings or think while moving",
      "Anyone who has tried journaling apps and given up",
      "Voice-first enthusiasts and early adopters",
    ],
    externalUrl: "https://nuro.so",
  },
  "Humn: The Future of Fitness in Denver": {
    about: `Omar Romero is reimagining what a gym can be. Humn isn't just another fitness center with rows of machines and mirrors—it's a space designed around what it truly means to be human.

The concept combines functional movement, recovery science, community, and mental wellness into one cohesive experience. Think less "gym bro culture" and more "holistic human performance."

This preview event is your chance to meet Omar, hear the vision firsthand, and get early access to founding memberships before Humn opens to the public.`,
    whatToExpect: [
      "Hear Omar's vision for Humn and the philosophy behind it",
      "See early designs and concepts for the space",
      "Q&A session with Omar",
      "Exclusive founding member pricing (up to 40% off)",
      "Light breakfast and coffee provided",
    ],
    whoShouldJoin: [
      "Fitness enthusiasts tired of traditional gyms",
      "People interested in holistic wellness",
      "Those looking for community-driven fitness",
      "Early adopters who want to shape a new concept",
    ],
  },
  "Beta Testing Swap": {
    about: `The hardest part of building a product is getting honest feedback from people who understand what you're building. This event solves that problem by bringing together 10 founders for structured user testing sessions.

Here's how it works: Each founder gets 15 minutes to have their product tested by another founder. You watch them use it, ask questions, and get real-time feedback. Then you swap.

By the end of the night, you'll have tested at least 3 other products and received feedback from 3 other builders who actually understand the struggle.`,
    whatToExpect: [
      "15-minute structured testing sessions",
      "Feedback from founders who understand product",
      "A framework for running your own user tests",
      "Connections with other builders in Denver",
      "Beer and snacks provided",
    ],
    whoShouldJoin: [
      "Founders with a working product or prototype",
      "Builders who want honest, constructive feedback",
      "Those willing to give thoughtful feedback to others",
      "Product-minded people at any stage",
    ],
  },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LabsDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [item, setItem] = useState<LabsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRsvping, setIsRsvping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user?.isAdmin || !params.id) return;

    async function fetchItem() {
      setLoading(true);
      try {
        const res = await fetch(`/api/labs/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data);
        } else {
          router.push("/labs");
        }
      } catch {
        router.push("/labs");
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [params.id, session?.user?.isAdmin, router]);

  async function handleRSVP() {
    if (!item) return;
    setIsRsvping(true);
    try {
      const isGoing = item.userRSVP?.status === "GOING";
      if (isGoing) {
        await fetch(`/api/labs/${item.id}/rsvp`, { method: "DELETE" });
        setItem((prev) =>
          prev
            ? {
                ...prev,
                userRSVP: null,
                rsvpCount: prev.rsvpCount - 1,
                spotsLeft: prev.spotsLeft !== null ? prev.spotsLeft + 1 : null,
                status: "ACTIVE",
              }
            : null
        );
      } else {
        const res = await fetch(`/api/labs/${item.id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "GOING" }),
        });
        if (res.ok) {
          setItem((prev) =>
            prev
              ? {
                  ...prev,
                  userRSVP: { status: "GOING" },
                  rsvpCount: prev.rsvpCount + 1,
                  spotsLeft: prev.spotsLeft !== null ? prev.spotsLeft - 1 : null,
                  status: prev.spotsLeft !== null && prev.spotsLeft <= 1 ? "FULL" : "ACTIVE",
                }
              : null
          );
        }
      }
    } catch {
      console.error("RSVP failed");
    } finally {
      setIsRsvping(false);
    }
  }

  async function handleSave() {
    if (!item) return;
    setIsSaving(true);
    try {
      const isSaved = !!item.userSave;
      if (isSaved) {
        await fetch(`/api/labs/${item.id}/save`, { method: "DELETE" });
        setItem((prev) =>
          prev
            ? { ...prev, userSave: null, saveCount: prev.saveCount - 1 }
            : null
        );
      } else {
        await fetch(`/api/labs/${item.id}/save`, { method: "POST" });
        setItem((prev) =>
          prev
            ? { ...prev, userSave: { id: "temp" }, saveCount: prev.saveCount + 1 }
            : null
        );
      }
    } catch {
      console.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  if (status === "loading" || loading || !item) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const config = TYPE_CONFIG[item.type];
  const isGoing = item.userRSVP?.status === "GOING";
  const isSaved = !!item.userSave;
  const isFull = item.status === "FULL";
  const detailedContent = DETAILED_CONTENT[item.title];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/labs"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Labs
      </Link>

      {/* Hero Image */}
      {item.imageUrl && (
        <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
              {config.emoji} {config.label}
            </span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Type badge if no image */}
          {!item.imageUrl && (
            <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${config.bgColor} ${config.color}`}>
              {config.emoji} {config.label}
            </span>
          )}

          <h1 className="text-3xl font-bold text-slate-900 mb-4">{item.title}</h1>

          {/* Description */}
          <p className="text-lg text-slate-600 mb-6">{item.description}</p>

          {/* Detailed Content */}
          {detailedContent ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">About</h2>
                <div className="prose prose-slate max-w-none">
                  {detailedContent.about.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-slate-600 mb-4">{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">What to Expect</h2>
                <ul className="space-y-2">
                  {detailedContent.whatToExpect.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-3">Who Should Join</h2>
                <ul className="space-y-2">
                  {detailedContent.whoShouldJoin.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {detailedContent.externalUrl && (
                <a
                  href={detailedContent.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Learn more at {detailedContent.externalUrl.replace("https://", "")}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-slate-500">More details coming soon...</p>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24">
            {/* Date/Time */}
            {item.startTime && (
              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 text-slate-900">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-medium">{formatDate(item.startTime)}</div>
                    <div className="text-sm text-slate-500">
                      {formatTime(item.startTime)}
                      {item.endTime && ` - ${formatTime(item.endTime)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {(item.venueName || item.isVirtual) && (
              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3 text-slate-900">
                  {item.isVirtual ? (
                    <svg className="w-5 h-5 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <div>
                    {item.isVirtual ? (
                      <>
                        <div className="font-medium">Virtual Event</div>
                        {item.virtualLink && (
                          <a
                            href={item.virtualLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:underline"
                          >
                            Join link
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-medium">{item.venueName}</div>
                        {item.address && (
                          <div className="text-sm text-slate-500">{item.address}</div>
                        )}
                        {item.neighborhood && (
                          <div className="text-sm text-slate-500">{item.neighborhood}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Host */}
            {item.hostName && (
              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {item.hostImageUrl ? (
                    <img
                      src={item.hostImageUrl}
                      alt={item.hostName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-medium">
                      {item.hostName[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-slate-500">Hosted by</div>
                    <div className="font-medium text-slate-900">{item.hostName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Capacity */}
            {item.capacity && (
              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">{item.rsvpCount} going</span>
                  <span className="text-slate-500">
                    {item.spotsLeft !== null && item.spotsLeft > 0
                      ? `${item.spotsLeft} spots left`
                      : "Full"}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? "bg-red-500" : "bg-purple-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (item.rsvpCount / item.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleRSVP}
                disabled={isRsvping || (isFull && !isGoing)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isGoing
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : isFull
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isRsvping ? "..." : isGoing ? "You're Going!" : isFull ? "Event Full" : "RSVP Now"}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  isSaved
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={isSaved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                {isSaved ? "Saved" : "Save for Later"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
