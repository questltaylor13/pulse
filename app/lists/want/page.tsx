"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnifiedList, UnifiedListItem, UnifiedListFilters } from "@/lib/actions/lists";
import { Category } from "@prisma/client";
import ListItemCard from "@/components/ListItemCard";

const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-100 text-purple-700",
  LIVE_MUSIC: "bg-pink-100 text-pink-700",
  BARS: "bg-amber-100 text-amber-700",
  FOOD: "bg-orange-100 text-orange-700",
  COFFEE: "bg-yellow-100 text-yellow-700",
  OUTDOORS: "bg-green-100 text-green-700",
  FITNESS: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-red-100 text-red-700",
  POPUP: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  ACTIVITY_VENUE: "bg-cyan-100 text-cyan-700",
};

const CATEGORY_LABELS: Record<Category, string> = {
  ART: "Art",
  LIVE_MUSIC: "Live Music",
  BARS: "Bars",
  FOOD: "Food",
  COFFEE: "Coffee",
  OUTDOORS: "Outdoors",
  FITNESS: "Fitness",
  SEASONAL: "Seasonal",
  POPUP: "Pop-up",
  OTHER: "Other",
  RESTAURANT: "Restaurant",
  ACTIVITY_VENUE: "Activity",
};

const FILTER_CATEGORIES: Category[] = [
  "LIVE_MUSIC",
  "FOOD",
  "BARS",
  "COFFEE",
  "ART",
  "OUTDOORS",
  "FITNESS",
  "RESTAURANT",
  "POPUP",
  "SEASONAL",
];

export default function WantListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<UnifiedListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [typeFilter, setTypeFilter] = useState<"EVENT" | "PLACE" | null>(null);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (!session.user.onboardingComplete) {
      router.push("/onboarding");
    }
  }, [session, status, router]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const filters: UnifiedListFilters = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (typeFilter) filters.type = typeFilter;

      const data = await getUnifiedList("WANT", Object.keys(filters).length > 0 ? filters : undefined);
      setItems(data);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, typeFilter]);

  useEffect(() => {
    if (session?.user?.onboardingComplete) {
      fetchList();
    }
  }, [session, fetchList]);

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearFilters = () => {
    setCategoryFilter(null);
    setTypeFilter(null);
  };

  const hasActiveFilters = categoryFilter !== null || typeFilter !== null;
  const eventCount = items.filter((i) => i.type === "EVENT").length;
  const placeCount = items.filter((i) => i.type === "PLACE").length;

  if (status === "loading" || !session?.user?.onboardingComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Want to do</h1>
          <p className="text-slate-600">
            {items.length} item{items.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " (filtered)" : " saved"}
            {!hasActiveFilters && eventCount > 0 && placeCount > 0 && (
              <span className="text-slate-400 ml-1">
                ({eventCount} event{eventCount !== 1 ? "s" : ""}, {placeCount} place{placeCount !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/lists/done"
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Done list
          </Link>
          <Link
            href="/feed"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            Discover more
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Type:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setTypeFilter(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                typeFilter === null
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("EVENT")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                typeFilter === "EVENT"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setTypeFilter("PLACE")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                typeFilter === "PLACE"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Places
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-600">Category:</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                categoryFilter === null
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  categoryFilter === cat
                    ? CATEGORY_COLORS[cat].replace("100", "600").replace(/text-\w+-700/, "text-white")
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="h-44 bg-slate-200" />
              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                  <div className="h-5 w-20 rounded-full bg-slate-200" />
                </div>
                <div className="h-6 w-3/4 rounded bg-slate-200 mb-2" />
                <div className="h-4 w-full rounded bg-slate-200 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          {hasActiveFilters ? (
            <>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No matching items</h3>
              <p className="mb-4 text-slate-600">
                Try adjusting your filters to see more results.
              </p>
              <button
                onClick={clearFilters}
                className="btn-primary"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">No items saved yet</h3>
              <p className="mb-4 text-slate-600">
                Browse events and places to save things you want to do.
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/feed" className="btn-primary">
                  Discover events
                </Link>
                <Link href="/places" className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
                  Browse places
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Card Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ListItemCard
              key={item.id}
              id={item.id}
              type={item.type}
              sourceId={item.sourceId}
              title={item.title}
              description={item.description}
              category={item.category}
              venueName={item.venueName}
              address={item.address}
              neighborhood={item.neighborhood}
              startTime={item.startTime}
              priceRange={item.priceRange}
              imageUrl={item.imageUrl}
              status={item.status}
              updatedAt={item.updatedAt}
              onStatusChange={fetchList}
            />
          ))}
        </div>
      )}
    </div>
  );
}
