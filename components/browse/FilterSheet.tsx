"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Category } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";
import { VIBE_TAGS } from "@/lib/constants/vibe-tags";

interface Props {
  onClose: () => void;
}

const PRICE_OPTIONS = [
  { label: "Any price", value: "" },
  { label: "Free", value: "free" },
  { label: "Under $25", value: "under-25" },
  { label: "Under $50", value: "under-50" },
  { label: "$50+", value: "50-plus" },
] as const;

const TIME_OPTIONS = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Late night", value: "late-night" },
] as const;

const SORT_OPTIONS = [
  { label: "Top picks", value: "top" },
  { label: "Soonest first", value: "soonest" },
  { label: "Price low to high", value: "price" },
  { label: "Distance", value: "distance" },
] as const;

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

function toggleSet<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
}

export default function FilterSheet({ onClose }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize local state from URL
  const [categories, setCategories] = useState<Set<string>>(
    () => new Set(searchParams?.get("category")?.split(",").filter(Boolean) ?? []),
  );
  const [price, setPrice] = useState(searchParams?.get("price") ?? "");
  const [vibes, setVibes] = useState<Set<string>>(
    () => new Set(searchParams?.get("vibe")?.split(",").filter(Boolean) ?? []),
  );
  const [times, setTimes] = useState<Set<string>>(
    () => new Set(searchParams?.get("time")?.split(",").filter(Boolean) ?? []),
  );
  const [sort, setSort] = useState(searchParams?.get("sort") ?? "top");

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    // Preserve non-filter params
    const preserve = ["day"];
    preserve.forEach((k) => {
      const v = searchParams?.get(k);
      if (v) params.set(k, v);
    });

    if (categories.size > 0) params.set("category", [...categories].join(","));
    if (price) params.set("price", price);
    if (vibes.size > 0) params.set("vibe", [...vibes].join(","));
    if (times.size > 0) params.set("time", [...times].join(","));
    if (sort && sort !== "top") params.set("sort", sort);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    onClose();
  }, [categories, price, vibes, times, sort, searchParams, router, pathname, onClose]);

  const handleClear = useCallback(() => {
    setCategories(new Set());
    setPrice("");
    setVibes(new Set());
    setTimes(new Set());
    setSort("top");
  }, []);

  return (
    <div className="fixed inset-0 z-modal flex flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-mute-divider px-5 py-4">
        <button onClick={onClose} className="text-body text-mute" aria-label="Close">
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 5l14 14" />
            <path d="M19 5 5 19" />
          </svg>
        </button>
        <h2 className="text-title font-medium text-ink">Filters</h2>
        <button onClick={handleClear} className="text-body text-coral">
          Clear
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Categories */}
        <section className="mb-6">
          <h3 className="mb-3 text-body font-semibold text-ink">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const active = categories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategories(toggleSet(categories, cat))}
                  className={`rounded-pill px-3 py-1.5 text-body transition-colors ${
                    active
                      ? "bg-ink text-surface"
                      : "border border-mute-divider bg-surface text-ink"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Price */}
        <section className="mb-6">
          <h3 className="mb-3 text-body font-semibold text-ink">Price</h3>
          <div className="flex flex-wrap gap-2">
            {PRICE_OPTIONS.map((opt) => {
              const active = price === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setPrice(opt.value)}
                  className={`rounded-pill px-3 py-1.5 text-body transition-colors ${
                    active
                      ? "bg-ink text-surface"
                      : "border border-mute-divider bg-surface text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Vibe */}
        <section className="mb-6">
          <h3 className="mb-3 text-body font-semibold text-ink">Vibe</h3>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((tag) => {
              const active = vibes.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => setVibes(toggleSet(vibes, tag))}
                  className={`rounded-pill px-3 py-1.5 text-body capitalize transition-colors ${
                    active
                      ? "bg-ink text-surface"
                      : "border border-mute-divider bg-surface text-ink"
                  }`}
                >
                  {tag.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time of day */}
        <section className="mb-6">
          <h3 className="mb-3 text-body font-semibold text-ink">Time of day</h3>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((opt) => {
              const active = times.has(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => setTimes(toggleSet(times, opt.value))}
                  className={`rounded-pill px-3 py-1.5 text-body transition-colors ${
                    active
                      ? "bg-ink text-surface"
                      : "border border-mute-divider bg-surface text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Sort */}
        <section className="mb-6">
          <h3 className="mb-3 text-body font-semibold text-ink">Sort by</h3>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`rounded-pill px-3 py-1.5 text-body transition-colors ${
                    active
                      ? "bg-ink text-surface"
                      : "border border-mute-divider bg-surface text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Fixed bottom bar */}
      <div className="border-t border-mute-divider bg-surface px-5 py-4 pb-safe">
        <button
          onClick={handleApply}
          className="w-full rounded-pill bg-coral py-3 text-body font-semibold text-surface transition-colors hover:bg-coral-dark active:bg-coral-dark"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}
