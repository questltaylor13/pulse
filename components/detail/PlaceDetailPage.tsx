"use client";

import { useState } from "react";
import Link from "next/link";
import { filterValidVibeTags } from "@/lib/constants/vibe-tags";
import SimilarItemsRow from "./SimilarItemsRow";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface UpcomingEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  startTime: Date;
}

interface SimilarPlace {
  id: string;
  name: string;
  primaryImageUrl: string | null;
  category: string | null;
  neighborhood: string | null;
  vibeTags: string[];
}

interface PlaceData {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  category: string | null;
  primaryImageUrl: string | null;
  priceLevel: number | null;
  vibeTags: string[];
  pulseDescription: string | null;
  googleMapsUrl: string | null;
  phoneNumber: string | null;
  website: string | null;
  openingHours: any;
  lat: number | null;
  lng: number | null;
}

interface Props {
  place: PlaceData;
  upcomingEvents: UpcomingEvent[];
  similarPlaces: SimilarPlace[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function priceLabel(level: number | null): string | null {
  if (level == null) return null;
  return "$".repeat(Math.max(1, Math.min(level, 4)));
}

function formatEventDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 rounded-card bg-mute-hush px-4 py-3"
    >
      {icon}
      <span className="text-[12px] text-mute">{label}</span>
    </a>
  );
}

function HoursTable({ hours }: { hours: any }) {
  const [expanded, setExpanded] = useState(false);

  if (!hours) return null;

  // openingHours can be an object with weekday_text array
  const weekdayText: string[] =
    Array.isArray(hours) ? hours : Array.isArray(hours.weekday_text) ? hours.weekday_text : [];

  if (weekdayText.length === 0) return null;

  return (
    <div className="mt-5 px-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-body font-medium text-ink"
      >
        <span>Hours</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1">
          {weekdayText.map((line: string, i: number) => (
            <li key={i} className="text-[13px] text-mute">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function PlaceDetailPage({ place, upcomingEvents, similarPlaces }: Props) {
  const vibes = filterValidVibeTags(place.vibeTags).slice(0, 4);
  const price = priceLabel(place.priceLevel);

  const directionsUrl =
    place.googleMapsUrl ??
    (place.lat != null && place.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
      : null);

  return (
    <div className="pb-24">
      {/* ---- Hero ---- */}
      <div className="relative h-80 w-full bg-mute-hush">
        {place.primaryImageUrl ? (
          <img
            src={place.primaryImageUrl}
            alt={place.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-mute-hush">
            <span className="text-[48px] opacity-30">&#x1f4cd;</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

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
      </div>

      {/* ---- Name + category + neighborhood + price ---- */}
      <div className="px-5 pt-4">
        <h1 className="text-[22px] font-medium text-ink">{place.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {place.category && (
            <span className="rounded-pill bg-coral/10 px-3 py-1 text-[12px] font-medium text-coral">
              {place.category.replace(/_/g, " ")}
            </span>
          )}
          {place.neighborhood && (
            <span className="text-body text-mute">{place.neighborhood}</span>
          )}
          {price && (
            <>
              <span className="text-mute-soft">&middot;</span>
              <span className="text-body text-mute">{price}</span>
            </>
          )}
        </div>
      </div>

      {/* ---- Vibe tags ---- */}
      {vibes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 px-5">
          {vibes.map((v) => (
            <span
              key={v}
              className="rounded-pill bg-mute-hush px-2.5 py-0.5 text-[11px] text-mute"
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* ---- Description ---- */}
      <div className="mt-5 px-5">
        <p className="whitespace-pre-line text-body leading-relaxed text-ink-soft">
          {place.pulseDescription ?? "No description available yet."}
        </p>
      </div>

      {/* ---- Quick actions ---- */}
      {(directionsUrl || place.phoneNumber || place.website) && (
        <div className="mt-5 flex gap-3 px-5">
          {directionsUrl && (
            <QuickAction
              href={directionsUrl}
              label="Directions"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              }
            />
          )}
          {place.phoneNumber && (
            <QuickAction
              href={`tel:${place.phoneNumber}`}
              label="Call"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
            />
          )}
          {place.website && (
            <QuickAction
              href={place.website}
              label="Website"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              }
            />
          )}
        </div>
      )}

      {/* ---- Hours ---- */}
      <HoursTable hours={place.openingHours} />

      {/* ---- Happening here ---- */}
      {upcomingEvents.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 px-5 text-title font-medium text-ink">Happening here</h3>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="w-40 shrink-0"
              >
                <div className="h-[100px] w-40 overflow-hidden rounded-card bg-mute-hush">
                  {ev.imageUrl ? (
                    <img
                      src={ev.imageUrl}
                      alt={ev.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-mute-soft">
                      <span className="text-[24px]">&#x1f3b6;</span>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-body font-medium text-ink">{ev.title}</p>
                <p className="truncate text-[12px] text-mute">{formatEventDate(ev.startTime)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- Similar places ---- */}
      <SimilarItemsRow
        heading="Similar places"
        items={similarPlaces.map((p) => ({
          id: p.id,
          href: `/places/${p.id}`,
          imageUrl: p.primaryImageUrl,
          title: p.name,
          subtitle: p.neighborhood ?? (p.category?.replace(/_/g, " ") ?? "Denver"),
        }))}
      />
    </div>
  );
}
