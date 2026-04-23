"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Category, EventRegion, ItemStatus } from "@prisma/client";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
} from "@/lib/constants/categories";

// PRD 5 Phase 2 §2.2 — full-screen taste-calibration flow.
//
// Opened via ?swiper=1 URL param (so browser back closes cleanly). On mount
// fetches /api/feedback/swiper-items; renders 12 cards one at a time with
// three buttons (Interested / Skip / Not for me) + "I've been there" chip.
// Each answer fires POST /api/feedback with source=PROFILE_SWIPER. On the
// 12th card (or when the user taps "Done for now") we flip to a completion
// summary. "See my feed" closes the overlay.

interface SwiperItem {
  kind: "event" | "place" | "discovery";
  id: string;
  title: string;
  description: string;
  category: Category;
  region: EventRegion;
  townName: string | null;
  imageUrl: string | null;
  meta: string | null;
}

type Counts = { interested: number; been: number; pass: number; skipped: number };

export default function TasteSwiper() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<SwiperItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState<Counts>({
    interested: 0,
    been: 0,
    pass: 0,
    skipped: 0,
  });
  const [finished, setFinished] = useState(false);

  const close = useCallback(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.delete("swiper");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }, [router, pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedback/swiper-items")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { items: SwiperItem[] }) => {
        if (cancelled) return;
        if (!data.items || data.items.length === 0) {
          setLoadError("No items to show right now.");
          return;
        }
        setItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? "Couldn't load items");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = items?.[index] ?? null;
  const total = items?.length ?? 0;

  const submitAndAdvance = async (
    action: "WANT" | "PASS" | "DONE" | "SKIP"
  ) => {
    if (!current) return;
    setSubmitting(true);
    try {
      if (action !== "SKIP") {
        const ref =
          current.kind === "event"
            ? { eventId: current.id }
            : current.kind === "place"
              ? { placeId: current.id }
              : { discoveryId: current.id };
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref, status: action, source: "PROFILE_SWIPER" }),
        });
      }

      setCounts((c) => ({
        interested: action === "WANT" ? c.interested + 1 : c.interested,
        been: action === "DONE" ? c.been + 1 : c.been,
        pass: action === "PASS" ? c.pass + 1 : c.pass,
        skipped: action === "SKIP" ? c.skipped + 1 : c.skipped,
      }));

      if (index + 1 >= total) {
        setFinished(true);
      } else {
        setIndex((i) => i + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <SwiperShell onClose={close}>
        <div className="px-8 pt-24 text-center">
          <p className="text-body text-ink">{loadError}</p>
          <button
            type="button"
            onClick={close}
            className="mt-6 rounded-full bg-ink px-5 py-2 text-sm font-medium text-surface"
          >
            Back to feed
          </button>
        </div>
      </SwiperShell>
    );
  }

  if (!items || !current) {
    return (
      <SwiperShell onClose={close}>
        <div className="px-8 pt-24 text-center">
          <p className="text-body text-mute">Loading taste-training…</p>
        </div>
      </SwiperShell>
    );
  }

  if (finished) {
    return (
      <SwiperShell onClose={close}>
        <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-8 text-center">
          <h2 className="text-display font-serif text-ink">Your feed just got smarter</h2>
          <p className="mt-3 text-body text-mute">
            {counts.interested} interested · {counts.been} already done · {counts.pass} not for me · {counts.skipped} skipped
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-8 rounded-full bg-ink px-5 py-3 text-sm font-medium text-surface"
          >
            See my feed →
          </button>
        </div>
      </SwiperShell>
    );
  }

  // Current card view
  const canExitEarly = index >= 2; // "Done for now" available from item 3

  return (
    <SwiperShell onClose={canExitEarly ? close : undefined}>
      <div className="mx-auto flex max-w-md flex-col px-5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-mute">
            {index + 1} of {total}
          </span>
          {canExitEarly && (
            <button
              type="button"
              onClick={close}
              className="text-[13px] font-medium text-mute hover:text-ink"
            >
              Done for now
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => submitAndAdvance("DONE")}
          className="mt-4 self-start rounded-full bg-purple-100 px-3 py-1 text-[12px] font-semibold text-purple-700 hover:bg-purple-200 disabled:opacity-50"
        >
          🎯 I've been there
        </button>

        <article className="mt-3 overflow-hidden rounded-card border border-mute-divider bg-surface">
          <div className="h-44 w-full bg-mute-hush">
            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">
                {CATEGORY_EMOJI[current.category]}
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-meta font-medium uppercase tracking-wide text-coral">
              {CATEGORY_LABELS[current.category]}
              {current.townName ? ` · ${current.townName}` : ""}
            </p>
            <h3 className="mt-1 text-title font-medium text-ink">{current.title}</h3>
            {current.description && (
              <p className="mt-1 line-clamp-3 text-body text-mute">{current.description}</p>
            )}
            {current.meta && (
              <p className="mt-1 text-[12px] text-amber-700">{current.meta}</p>
            )}
          </div>
        </article>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitAndAdvance("PASS")}
            className="rounded-full border border-mute-divider bg-surface py-3 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            Not for me
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitAndAdvance("SKIP")}
            className="rounded-full bg-mute-hush py-3 text-[13px] font-medium text-ink disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitAndAdvance("WANT")}
            className="rounded-full bg-teal py-3 text-[13px] font-semibold text-white hover:bg-teal-light disabled:opacity-50"
          >
            Interested
          </button>
        </div>
      </div>
    </SwiperShell>
  );
}

function SwiperShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Taste training"
      className="fixed inset-0 z-modal overflow-y-auto bg-surface"
    >
      {onClose && (
        <button
          type="button"
          aria-label="Close taste training"
          onClick={onClose}
          className="fixed right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-sm hover:bg-mute-hush"
        >
          ✕
        </button>
      )}
      {children}
    </div>
  );
}
