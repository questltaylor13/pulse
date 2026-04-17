"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GuideTimeline from "./GuideTimeline";
import SoftAuthModal from "@/components/home/SoftAuthModal";

interface GuideDetailData {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  coverImageUrl: string | null;
  description: string;
  durationLabel: string;
  durationMinutes: number;
  neighborhoodHub: string | null;
  costRangeLabel: string;
  occasionTags: string[];
  vibeTags: string[];
  isFeatured: boolean;
  saveCount: number;
  creator: {
    handle: string;
    displayName: string;
    profileImageUrl: string | null;
    specialties: string[];
  };
  stops: Array<{
    id: string;
    order: number;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    note: string;
    insiderTip: string | null;
    walkTimeToNext: number | null;
    place: {
      name: string;
      neighborhood: string | null;
      category: string | null;
      primaryImageUrl: string | null;
    } | null;
    event: {
      title: string;
      venueName: string;
      neighborhood: string | null;
      category: string | null;
      imageUrl: string | null;
    } | null;
  }>;
}

interface Props {
  guide: GuideDetailData;
}

export default function GuideDetailPage({ guide }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const creatorLabel = guide.creator.specialties?.[0] ?? "Creator";

  async function handleUseGuide() {
    if (!session) {
      setAuthOpen(true);
      return;
    }
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId: guide.id, action: "save" }),
      });
      setSaved(true);
      setToastMsg("Guide saved. Active mode coming soon.");
      setTimeout(() => setToastMsg(null), 3500);
    } catch {
      setToastMsg("Something went wrong. Try again.");
      setTimeout(() => setToastMsg(null), 3500);
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* Hero cover image */}
      <div className="relative h-[280px] w-full bg-mute-hush">
        {guide.coverImageUrl && (
          <Image
            src={guide.coverImageUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/30" />
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur"
          aria-label="Go back"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Share button */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: guide.title,
                url: `/guides/${guide.slug}`,
              });
            }
          }}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur"
          aria-label="Share"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
        {/* Title at bottom */}
        <div className="absolute inset-x-4 bottom-4">
          <h1 className="text-[22px] font-semibold leading-snug text-white">
            {guide.title}
          </h1>
          <p className="mt-1 text-[14px] text-white/85">{guide.tagline}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-5">
        {/* Creator block */}
        <div className="flex items-center gap-3 py-4">
          <Link
            href={`/influencers/${guide.creator.handle}`}
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-mute-hush"
          >
            {guide.creator.profileImageUrl && (
              <Image
                src={guide.creator.profileImageUrl}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/influencers/${guide.creator.handle}`}
              className="text-[14px] font-medium text-ink hover:underline"
            >
              {guide.creator.displayName}
            </Link>
            <p className="text-[12px] text-mute">{creatorLabel}</p>
          </div>
          <button className="rounded-pill border border-mute-divider px-4 py-1.5 text-[13px] font-medium text-ink">
            Follow
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 border-b border-mute-divider pb-4 text-[12px] text-mute">
          <span>{guide.durationLabel}</span>
          <span>&middot;</span>
          <span>{guide.stops.length} stops</span>
          {guide.neighborhoodHub && (
            <>
              <span>&middot;</span>
              <span>{guide.neighborhoodHub}</span>
            </>
          )}
          <span>&middot;</span>
          <span>{guide.costRangeLabel}</span>
        </div>

        {/* About */}
        {guide.description && (
          <div className="border-b border-mute-divider py-4">
            <h2 className="text-[15px] font-medium text-ink">
              About this guide
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink/80">
              {guide.description}
            </p>
          </div>
        )}

        {/* Use this guide CTA */}
        <div className="py-4">
          <button
            onClick={handleUseGuide}
            disabled={saved}
            className={`flex h-12 w-full items-center justify-center rounded-pill text-[15px] font-medium transition ${
              saved
                ? "bg-mute-hush text-mute"
                : "bg-coral text-surface hover:bg-coral/90"
            }`}
          >
            {saved ? "Guide saved" : "Use this guide"}
          </button>
        </div>

        {/* Stops timeline */}
        <div className="py-4">
          <h2 className="mb-4 text-[15px] font-medium text-ink">
            Stops ({guide.stops.length})
          </h2>
          <GuideTimeline stops={guide.stops} />
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center"
        >
          <div className="pointer-events-auto max-w-sm rounded-card bg-ink px-4 py-3 text-[13px] text-surface shadow-md">
            {toastMsg}
          </div>
        </div>
      )}

      <SoftAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        action="save this guide"
      />
    </div>
  );
}
