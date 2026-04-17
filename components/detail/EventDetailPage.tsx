"use client";

import Link from "next/link";
import { filterValidVibeTags } from "@/lib/constants/vibe-tags";
import SimilarItemsRow from "./SimilarItemsRow";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface EventPlace {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

interface SimilarEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  category: string;
  startTime: Date;
  venueName: string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: string;
  startTime: string;
  endTime: string | null;
  venueName: string;
  address: string;
  neighborhood: string | null;
  priceRange: string;
  ticketUrl: string | null;
  sourceUrl: string | null;
  vibeTags: string[];
  tags: string[];
  oneLiner: string | null;
  place: EventPlace | null;
}

interface Props {
  event: EventData;
  similarEvents: SimilarEvent[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(start: string, end: string | null): string {
  const s = formatTime(start);
  if (!end) return s;
  return `${s} - ${formatTime(end)}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function EventDetailPage({ event, similarEvents }: Props) {
  const vibes = filterValidVibeTags(event.vibeTags).slice(0, 4);
  const hasTicketLink = event.ticketUrl || event.sourceUrl;

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="pb-24">
      {/* ---- Hero ---- */}
      <div className="relative h-80 w-full bg-mute-hush">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        )}
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Back button */}
        <Link
          href="/"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          aria-label="Share"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-[22px] font-medium leading-tight text-white">{event.title}</h1>
          {event.oneLiner && (
            <p className="mt-1 text-[14px] text-white/80">{event.oneLiner}</p>
          )}
        </div>
      </div>

      {/* ---- Meta row ---- */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 pt-4 text-body text-mute">
        <span className="flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatDate(event.startTime)} {formatTimeRange(event.startTime, event.endTime)}
        </span>
        <span className="text-mute-soft">&middot;</span>
        <span>{event.venueName}</span>
        {event.priceRange && event.priceRange !== "Free" && (
          <>
            <span className="text-mute-soft">&middot;</span>
            <span>{event.priceRange}</span>
          </>
        )}
        {event.priceRange === "Free" && (
          <>
            <span className="text-mute-soft">&middot;</span>
            <span className="font-medium text-teal">Free</span>
          </>
        )}
      </div>

      {/* ---- Category chip + vibe tags ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-5">
        <span className="rounded-pill bg-coral/10 px-3 py-1 text-[12px] font-medium text-coral">
          {event.category.replace(/_/g, " ")}
        </span>
        {vibes.map((v) => (
          <span
            key={v}
            className="rounded-pill bg-mute-hush px-2.5 py-0.5 text-[11px] text-mute"
          >
            {v}
          </span>
        ))}
      </div>

      {/* ---- Description ---- */}
      <div className="mt-5 px-5">
        <p className="whitespace-pre-line text-body leading-relaxed text-ink-soft">
          {event.description}
        </p>
      </div>

      {/* ---- Venue card ---- */}
      {event.place && (
        <Link
          href={`/places/${event.place.id}`}
          className="mx-5 mt-5 block rounded-card border border-mute-divider p-4"
        >
          <p className="text-meta uppercase tracking-wide text-mute">Venue</p>
          <p className="mt-1 text-body font-medium text-ink">{event.place.name}</p>
          <p className="text-[13px] text-mute">{event.place.address}</p>
        </Link>
      )}

      {/* ---- CTA ---- */}
      {hasTicketLink && (
        <div className="mt-6 px-5">
          <a
            href={event.ticketUrl ?? event.sourceUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-pill bg-coral py-3.5 text-center text-body font-medium text-white"
          >
            {event.ticketUrl ? "Get tickets" : "Event info"}
          </a>
        </div>
      )}

      {/* ---- Similar events ---- */}
      <SimilarItemsRow
        heading="Similar events"
        items={similarEvents.map((e) => ({
          id: e.id,
          href: `/events/${e.id}`,
          imageUrl: e.imageUrl,
          title: e.title,
          subtitle: e.venueName,
        }))}
      />
    </div>
  );
}
