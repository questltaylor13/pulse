"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import { Category, ItemStatus } from "@prisma/client";

interface PlaceItem {
  id: string;
  type: "PLACE";
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  neighborhood: string | null;
  hours: string | null;
  imageUrl: string | null;
}

const PLACE_CATEGORIES: Category[] = [
  "RESTAURANT",
  "ACTIVITY_VENUE",
  "BARS",
  "COFFEE",
  "FOOD",
];

const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANT: "Restaurants",
  ACTIVITY_VENUE: "Activities",
  BARS: "Bars",
  COFFEE: "Coffee",
  FOOD: "Food",
  ALL: "All Places",
};

// Subcategories for specific place categories
const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  RESTAURANT: [
    { value: "american", label: "American" },
    { value: "italian", label: "Italian" },
    { value: "mexican", label: "Mexican" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "chinese", label: "Chinese" },
    { value: "thai", label: "Thai" },
    { value: "indian", label: "Indian" },
    { value: "mediterranean", label: "Mediterranean" },
    { value: "brunch", label: "Brunch" },
    { value: "pizza", label: "Pizza" },
    { value: "seafood", label: "Seafood" },
    { value: "steakhouse", label: "Steakhouse" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "upscale", label: "Upscale" },
    { value: "casual", label: "Casual" },
  ],
  FOOD: [
    { value: "american", label: "American" },
    { value: "italian", label: "Italian" },
    { value: "mexican", label: "Mexican" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "chinese", label: "Chinese" },
    { value: "thai", label: "Thai" },
    { value: "indian", label: "Indian" },
    { value: "mediterranean", label: "Mediterranean" },
    { value: "brunch", label: "Brunch" },
    { value: "pizza", label: "Pizza" },
    { value: "seafood", label: "Seafood" },
    { value: "fast-casual", label: "Fast Casual" },
  ],
  BARS: [
    { value: "cocktail", label: "Cocktail Bar" },
    { value: "dive", label: "Dive Bar" },
    { value: "sports", label: "Sports Bar" },
    { value: "wine", label: "Wine Bar" },
    { value: "brewery", label: "Brewery" },
    { value: "rooftop", label: "Rooftop" },
    { value: "speakeasy", label: "Speakeasy" },
    { value: "lounge", label: "Lounge" },
    { value: "pub", label: "Pub" },
    { value: "club", label: "Club" },
  ],
  COFFEE: [
    { value: "specialty", label: "Specialty Coffee" },
    { value: "cafe", label: "Cafe" },
    { value: "coworking", label: "Good for Working" },
    { value: "pastries", label: "Great Pastries" },
  ],
};

export default function PlacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | "ALL">("ALL");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});

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

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") {
        params.set("category", selectedCategory);
      }
      if (selectedSubcategories.length > 0) {
        params.set("subcategories", selectedSubcategories.join(","));
      }
      const queryString = params.toString();
      const response = await fetch(`/api/places${queryString ? `?${queryString}` : ""}`);
      if (response.ok) {
        const data = await response.json();
        setPlaces(data.places);
        setStatuses(data.statuses || {});
      }
    } catch (error) {
      console.error("Failed to fetch places:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubcategories]);

  useEffect(() => {
    if (session?.user?.onboardingComplete) {
      fetchPlaces();
    }
  }, [session, fetchPlaces]);

  const handleCategoryChange = (newCategory: Category | "ALL") => {
    setSelectedCategory(newCategory);
    setSelectedSubcategories([]); // Clear subcategories when changing category
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategory)
        ? prev.filter((s) => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const clearSubcategoryFilter = () => {
    setSelectedSubcategories([]);
  };

  const handleStatusChange = (itemId: string, newStatus: ItemStatus | null) => {
    if (newStatus) {
      setStatuses((prev) => ({ ...prev, [itemId]: newStatus }));
    } else {
      setStatuses((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Places</h1>
          <p className="text-slate-600">
            Discover restaurants, activities, and more in Denver
          </p>
        </div>
        <Link
          href="/feed"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          View Events
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange("ALL")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedCategory === "ALL"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Places
        </button>
        {PLACE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === cat
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Subcategory Filter - shows when applicable categories are selected */}
      {selectedCategory !== "ALL" && SUBCATEGORIES[selectedCategory] && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Filter by type:
            </span>
            {selectedSubcategories.length > 0 && (
              <button
                onClick={clearSubcategoryFilter}
                className="text-xs text-slate-500 hover:text-primary transition"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUBCATEGORIES[selectedCategory].map((sub) => (
              <button
                key={sub.value}
                onClick={() => handleSubcategoryToggle(sub.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedSubcategories.includes(sub.value)
                    ? "bg-primary/80 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-20 rounded bg-slate-200 mb-3" />
              <div className="h-5 w-3/4 rounded bg-slate-200 mb-2" />
              <div className="h-4 w-full rounded bg-slate-200 mb-4" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {/* Places grid */}
      {!loading && places.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <ItemCard
              key={place.id}
              id={place.id}
              type="PLACE"
              title={place.title}
              description={place.description}
              category={place.category}
              tags={place.tags}
              venueName={place.venueName}
              address={place.address}
              startTime={null}
              priceRange={place.priceRange}
              source={place.source}
              sourceUrl={place.sourceUrl}
              neighborhood={place.neighborhood}
              hours={place.hours}
              imageUrl={place.imageUrl}
              status={statuses[place.id] || null}
              onStatusChange={(status) => handleStatusChange(place.id, status)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && places.length === 0 && (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No places found</h3>
          <p className="text-slate-600">
            {selectedCategory !== "ALL"
              ? `No ${CATEGORY_LABELS[selectedCategory]?.toLowerCase() || "places"} available yet.`
              : "Places will appear here once they're added."}
          </p>
        </div>
      )}
    </div>
  );
}
