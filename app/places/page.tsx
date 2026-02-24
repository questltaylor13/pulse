"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PlaceCard from "@/components/PlaceCard";
import { Category, ItemStatus } from "@prisma/client";

interface PlaceItem {
  id: string;
  placeId: string;
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
  googleRating: number | null;
  googleReviewCount: number | null;
  vibeTags: string[];
  companionTags: string[];
  isNew: boolean;
  isDogFriendly: boolean;
  dogFriendlyNotes: string | null;
  isDrinkingOptional: boolean;
  isAlcoholFree: boolean;
  hasMocktailMenu: boolean;
  soberFriendlyNotes: string | null;
}

// Main category tabs
const MAIN_TABS = [
  { id: "all", label: "All", emoji: "📍" },
  { id: "food-drink", label: "Food & Drink", emoji: "🍽️" },
  { id: "experiences", label: "Experiences", emoji: "🎯" },
  { id: "entertainment", label: "Entertainment", emoji: "🎵" },
  { id: "outdoors", label: "Outdoors", emoji: "🏔️" },
  { id: "new", label: "New & Trending", emoji: "✨" },
];

// Sub-filters for Experiences tab
const EXPERIENCE_SUBCATEGORIES = [
  { id: "all", label: "All Experiences" },
  { id: "creative", label: "Creative", description: "Glass blowing, pottery, candle making" },
  { id: "active", label: "Active", description: "Axe throwing, rock climbing, escape rooms" },
  { id: "wellness", label: "Wellness", description: "Spa, float tanks, meditation" },
  { id: "entertainment", label: "Entertainment", description: "Speakeasy, karaoke, arcades" },
];

// Vibe quick filters
const VIBE_FILTERS = [
  { id: "date-night", label: "Date Night", emoji: "💕" },
  { id: "group", label: "Group", emoji: "👥" },
  { id: "solo", label: "Solo", emoji: "🧘" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
];

export default function PlacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [experienceSubcategory, setExperienceSubcategory] = useState("all");
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
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

      // Main tab filter
      if (activeTab !== "all") {
        if (activeTab === "new") {
          params.set("new", "true");
        } else {
          params.set("tab", activeTab);
        }
      }

      // Experience subcategory
      if (activeTab === "experiences" && experienceSubcategory !== "all") {
        params.set("subcategory", experienceSubcategory);
      }

      // Vibe filter
      if (activeVibe) {
        params.set("vibe", activeVibe);
      }

      // Always exclude done/passed
      params.set("excludeDone", "true");

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
  }, [activeTab, experienceSubcategory, activeVibe]);

  useEffect(() => {
    if (session?.user?.onboardingComplete) {
      fetchPlaces();
    }
  }, [session, fetchPlaces]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Reset experience subcategory when switching tabs
    if (tabId !== "experiences") {
      setExperienceSubcategory("all");
    }
  };

  const handleVibeToggle = (vibeId: string) => {
    setActiveVibe(activeVibe === vibeId ? null : vibeId);
  };

  const handleStatusChange = (itemId: string, newStatus: ItemStatus | null, removed?: boolean) => {
    if (removed) {
      // Remove from list immediately for better UX
      setPlaces((prev) => prev.filter((p) => p.id !== itemId));
    }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Places</h1>
        <p className="text-slate-600">
          Discover unique spots and experiences in Denver
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Experience Subcategories - only show when Experiences tab is active */}
      {activeTab === "experiences" && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Experience type</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {EXPERIENCE_SUBCATEGORIES.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setExperienceSubcategory(sub.id)}
                className={`group whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  experienceSubcategory === sub.id
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
          {/* Show description for selected subcategory */}
          {experienceSubcategory !== "all" && (
            <p className="text-xs text-slate-500">
              {EXPERIENCE_SUBCATEGORIES.find((s) => s.id === experienceSubcategory)?.description}
            </p>
          )}
        </div>
      )}

      {/* Vibe Quick Filters */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-700">Good for</div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {VIBE_FILTERS.map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => handleVibeToggle(vibe.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeVibe === vibe.id
                  ? "bg-violet-100 text-violet-700 border border-violet-300"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              <span>{vibe.emoji}</span>
              <span>{vibe.label}</span>
            </button>
          ))}
          {activeVibe && (
            <button
              onClick={() => setActiveVibe(null)}
              className="whitespace-nowrap text-sm text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="text-sm text-slate-500">
          {places.length} {places.length === 1 ? "place" : "places"} found
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-pulse">
              <div className="h-36 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-200" />
                <div className="h-8 w-24 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Places grid */}
      {!loading && places.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              id={place.id}
              placeId={place.placeId}
              title={place.title}
              description={place.description}
              category={place.category}
              tags={place.tags}
              venueName={place.venueName}
              address={place.address}
              neighborhood={place.neighborhood}
              priceRange={place.priceRange}
              hours={place.hours}
              imageUrl={place.imageUrl}
              googleRating={place.googleRating}
              googleReviewCount={place.googleReviewCount}
              vibeTags={place.vibeTags}
              companionTags={place.companionTags}
              status={statuses[place.id] || null}
              onStatusChange={(status, removed) => handleStatusChange(place.id, status, removed)}
              isNew={place.isNew}
              isDogFriendly={place.isDogFriendly}
              dogFriendlyNotes={place.dogFriendlyNotes}
              isDrinkingOptional={place.isDrinkingOptional}
              isAlcoholFree={place.isAlcoholFree}
              hasMocktailMenu={place.hasMocktailMenu}
              soberFriendlyNotes={place.soberFriendlyNotes}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && places.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 text-center py-16 px-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-3xl">
              {MAIN_TABS.find((t) => t.id === activeTab)?.emoji || "📍"}
            </span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No places found
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            {activeTab === "experiences"
              ? "Experience venues are coming soon! We're adding glass blowing, escape rooms, and more unique Denver spots."
              : activeTab === "new"
              ? "No new places added in the last 90 days. Check back soon!"
              : activeVibe
              ? `No places match your "${activeVibe.replace("-", " ")}" vibe filter. Try clearing the filter.`
              : "Places will appear here as they're added. Check back soon!"}
          </p>
          {activeVibe && (
            <button
              onClick={() => setActiveVibe(null)}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Clear vibe filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
