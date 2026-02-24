"use client";

import { useState } from "react";
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
  { label: string; color: string; emoji: string }
> = {
  COWORKING_SESSION: {
    label: "Coworking",
    color: "bg-blue-100 text-blue-700",
    emoji: "💻",
  },
  STARTUP_EVENT: {
    label: "Startup Event",
    color: "bg-green-100 text-green-700",
    emoji: "🚀",
  },
  BUILDER_MEETUP: {
    label: "Builder Meetup",
    color: "bg-purple-100 text-purple-700",
    emoji: "🔨",
  },
  GET_INVOLVED: {
    label: "Get Involved",
    color: "bg-orange-100 text-orange-700",
    emoji: "🤝",
  },
  WORKSHOP: {
    label: "Workshop",
    color: "bg-pink-100 text-pink-700",
    emoji: "📚",
  },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LabsItemCard({
  item,
  onUpdate,
}: {
  item: LabsItem;
  onUpdate?: () => void;
}) {
  const [isRsvping, setIsRsvping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localItem, setLocalItem] = useState(item);

  const config = TYPE_CONFIG[item.type];
  const isGoing = localItem.userRSVP?.status === "GOING";
  const isSaved = !!localItem.userSave;
  const isFull = localItem.status === "FULL";

  async function handleRSVP() {
    setIsRsvping(true);
    try {
      if (isGoing) {
        await fetch(`/api/labs/${item.id}/rsvp`, { method: "DELETE" });
        setLocalItem((prev) => ({
          ...prev,
          userRSVP: null,
          rsvpCount: prev.rsvpCount - 1,
          spotsLeft: prev.spotsLeft !== null ? prev.spotsLeft + 1 : null,
          status: "ACTIVE",
        }));
      } else {
        const res = await fetch(`/api/labs/${item.id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "GOING" }),
        });
        if (res.ok) {
          setLocalItem((prev) => ({
            ...prev,
            userRSVP: { status: "GOING" },
            rsvpCount: prev.rsvpCount + 1,
            spotsLeft: prev.spotsLeft !== null ? prev.spotsLeft - 1 : null,
            status:
              prev.spotsLeft !== null && prev.spotsLeft <= 1 ? "FULL" : "ACTIVE",
          }));
        } else {
          const data = await res.json();
          alert(data.error || "Failed to RSVP");
        }
      }
      onUpdate?.();
    } catch {
      /* silently handled */
    } finally {
      setIsRsvping(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (isSaved) {
        await fetch(`/api/labs/${item.id}/save`, { method: "DELETE" });
        setLocalItem((prev) => ({
          ...prev,
          userSave: null,
          saveCount: prev.saveCount - 1,
        }));
      } else {
        await fetch(`/api/labs/${item.id}/save`, { method: "POST" });
        setLocalItem((prev) => ({
          ...prev,
          userSave: { id: "temp" },
          saveCount: prev.saveCount + 1,
        }));
      }
      onUpdate?.();
    } catch {
      /* silently handled */
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
      <Link href={`/labs/${item.id}`} className="block">
        {/* Image */}
        {localItem.imageUrl && (
          <div className="relative h-40 bg-slate-100">
            <img
              src={localItem.imageUrl}
              alt={localItem.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 left-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.emoji} {config.label}
              </span>
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Type badge if no image */}
          {!localItem.imageUrl && (
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${config.color}`}>
              {config.emoji} {config.label}
            </span>
          )}

          {/* Title & Description */}
          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">{localItem.title}</h3>
        {localItem.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {localItem.description}
          </p>
        )}

        {/* Date/Time */}
        {localItem.startTime && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {formatDate(localItem.startTime)} at {formatTime(localItem.startTime)}
              {localItem.endTime && ` - ${formatTime(localItem.endTime)}`}
            </span>
          </div>
        )}

        {/* Location */}
        {(localItem.venueName || localItem.isVirtual) && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            {localItem.isVirtual ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Virtual Event</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  {localItem.venueName}
                  {localItem.neighborhood && ` · ${localItem.neighborhood}`}
                </span>
              </>
            )}
          </div>
        )}

        {/* Host */}
        {localItem.hostName && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
            {localItem.hostImageUrl ? (
              <img
                src={localItem.hostImageUrl}
                alt={localItem.hostName}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-medium">
                {localItem.hostName[0]}
              </div>
            )}
            <span>Hosted by {localItem.hostName}</span>
          </div>
        )}

        {/* Tags */}
        {localItem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {localItem.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Capacity indicator */}
        {localItem.capacity && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{localItem.rsvpCount} going</span>
              <span>
                {localItem.spotsLeft !== null && localItem.spotsLeft > 0
                  ? `${localItem.spotsLeft} spots left`
                  : "Full"}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? "bg-red-500" : "bg-purple-500"
                }`}
                style={{
                  width: `${Math.min(100, (localItem.rsvpCount / localItem.capacity) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
        </div>
      </Link>

      {/* Actions - outside Link to prevent navigation on click */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRSVP();
          }}
          disabled={isRsvping || (isFull && !isGoing)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isGoing
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : isFull
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
        >
          {isRsvping ? "..." : isGoing ? "Going" : isFull ? "Full" : "RSVP"}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          }}
          disabled={isSaving}
          className={`px-3 py-2 rounded-lg transition ${
            isSaved
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          title={isSaved ? "Saved" : "Save for later"}
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
        </button>
      </div>
    </div>
  );
}
