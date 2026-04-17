"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon, SearchIcon } from "@/components/icons";
import SearchResultItem from "./SearchResultItem";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SearchEvent {
  id: string;
  title: string;
  imageUrl: string | null;
  venueName: string;
  category: string;
}

interface SearchPlace {
  id: string;
  name: string;
  primaryImageUrl: string | null;
  neighborhood: string | null;
  category: string | null;
}

interface SearchGuide {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  tagline: string | null;
}

interface SearchNeighborhood {
  slug: string;
  name: string;
  placeCount: number;
}

interface SearchResults {
  events: SearchEvent[];
  places: SearchPlace[];
  guides: SearchGuide[];
  neighborhoods: SearchNeighborhood[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CURATED_SEARCHES = [
  "Music tonight",
  "Weekend brunch",
  "Dog-friendly patios",
  "Free events",
  "Date night",
  "New restaurants",
];

const EMPTY: SearchResults = { events: [], places: [], guides: [], neighborhoods: [] };

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* --- Fetch recent searches when overlay opens --- */
  useEffect(() => {
    if (!open) {
      setQ("");
      setResults(EMPTY);
      return;
    }
    // Focus input after mount
    requestAnimationFrame(() => inputRef.current?.focus());

    fetch("/api/search/recent")
      .then((r) => (r.ok ? r.json() : { searches: [] }))
      .then((d) => setRecentSearches(d.searches ?? []))
      .catch(() => {});
  }, [open]);

  /* --- Escape to close --- */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* --- Debounced typeahead --- */
  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResults = await res.json();
        setResults(data);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 150);
  }, []);

  const handleChange = (value: string) => {
    setQ(value);
    search(value);
  };

  /* --- Record search + navigate --- */
  const recordAndNavigate = (href: string) => {
    const trimmed = q.trim();
    if (trimmed.length >= 2) {
      const total =
        results.events.length +
        results.places.length +
        results.guides.length +
        results.neighborhoods.length;
      fetch("/api/search/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, resultsCount: total }),
      }).catch(() => {});
    }
    onClose();
    router.push(href);
  };

  const handleSuggestion = (s: string) => {
    setQ(s);
    search(s);
  };

  if (!open) return null;

  const hasQuery = q.trim().length >= 2;
  const hasResults =
    results.events.length > 0 ||
    results.places.length > 0 ||
    results.guides.length > 0 ||
    results.neighborhoods.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-modal flex flex-col bg-surface"
    >
      {/* ---- Search bar ---- */}
      <div className="flex items-center gap-2 border-b border-mute-divider px-5 py-3">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-search bg-mute-hush px-4">
          <SearchIcon size={16} className="text-mute" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            placeholder="Search events, places, guides..."
            value={q}
            onChange={(e) => handleChange(e.target.value)}
            className="h-full flex-1 bg-transparent text-body text-ink outline-none placeholder:text-mute"
          />
        </div>
        <button
          aria-label="Close search"
          onClick={onClose}
          className="rounded-full p-2 text-ink hover:bg-mute-hush"
        >
          <CloseIcon size={22} />
        </button>
      </div>

      {/* ---- Body ---- */}
      <div className="flex-1 overflow-y-auto">
        {/* --- Empty state: curated + recent searches --- */}
        {!hasQuery && (
          <div className="px-5 py-6">
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <p className="text-meta uppercase tracking-wide text-mute">Recent searches</p>
                <ul className="mt-3 space-y-2">
                  {recentSearches.map((s) => (
                    <li key={s}>
                      <button
                        onClick={() => handleSuggestion(s)}
                        className="w-full rounded-card bg-mute-hush px-4 py-3 text-left text-body text-ink"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-meta uppercase tracking-wide text-mute">Try searching</p>
            <ul className="mt-3 space-y-2">
              {CURATED_SEARCHES.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => handleSuggestion(s)}
                    className="w-full rounded-card bg-mute-hush px-4 py-3 text-left text-body text-ink"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- Loading --- */}
        {hasQuery && loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-mute border-t-coral" />
          </div>
        )}

        {/* --- No results --- */}
        {hasQuery && !loading && !hasResults && (
          <p className="py-8 text-center text-body text-mute">
            No results found. Try a different search.
          </p>
        )}

        {/* --- Grouped results --- */}
        {hasQuery && !loading && hasResults && (
          <div className="px-5 py-4 space-y-5">
            {/* Events */}
            {results.events.length > 0 && (
              <section>
                <p className="mb-2 text-meta uppercase tracking-wide text-mute">Events</p>
                <ul>
                  {results.events.map((e) => (
                    <SearchResultItem
                      key={e.id}
                      href={`/events/${e.id}`}
                      imageUrl={e.imageUrl}
                      title={e.title}
                      subtitle={e.venueName}
                      onClick={() => recordAndNavigate(`/events/${e.id}`)}
                    />
                  ))}
                </ul>
                {results.events.length >= 3 && (
                  <button
                    onClick={() => recordAndNavigate(`/browse?q=${encodeURIComponent(q.trim())}&tab=events`)}
                    className="mt-1 text-[13px] font-medium text-coral"
                  >
                    See all events
                  </button>
                )}
              </section>
            )}

            {/* Places */}
            {results.places.length > 0 && (
              <section>
                <p className="mb-2 text-meta uppercase tracking-wide text-mute">Places</p>
                <ul>
                  {results.places.map((p) => (
                    <SearchResultItem
                      key={p.id}
                      href={`/places/${p.id}`}
                      imageUrl={p.primaryImageUrl}
                      title={p.name}
                      subtitle={p.neighborhood ?? "Denver"}
                      onClick={() => recordAndNavigate(`/places/${p.id}`)}
                    />
                  ))}
                </ul>
                {results.places.length >= 3 && (
                  <button
                    onClick={() => recordAndNavigate(`/browse?q=${encodeURIComponent(q.trim())}&tab=places`)}
                    className="mt-1 text-[13px] font-medium text-coral"
                  >
                    See all places
                  </button>
                )}
              </section>
            )}

            {/* Guides */}
            {results.guides.length > 0 && (
              <section>
                <p className="mb-2 text-meta uppercase tracking-wide text-mute">Guides</p>
                <ul>
                  {results.guides.map((g) => (
                    <SearchResultItem
                      key={g.id}
                      href={`/guides/${g.slug}`}
                      imageUrl={g.coverImageUrl}
                      title={g.title}
                      subtitle={g.tagline ?? "Guide"}
                      onClick={() => recordAndNavigate(`/guides/${g.slug}`)}
                    />
                  ))}
                </ul>
                {results.guides.length >= 3 && (
                  <button
                    onClick={() => recordAndNavigate(`/browse?q=${encodeURIComponent(q.trim())}&tab=guides`)}
                    className="mt-1 text-[13px] font-medium text-coral"
                  >
                    See all guides
                  </button>
                )}
              </section>
            )}

            {/* Neighborhoods */}
            {results.neighborhoods.length > 0 && (
              <section>
                <p className="mb-2 text-meta uppercase tracking-wide text-mute">Neighborhoods</p>
                <ul>
                  {results.neighborhoods.map((n) => (
                    <SearchResultItem
                      key={n.slug}
                      href={`/neighborhoods/${n.slug}`}
                      imageUrl={null}
                      title={n.name}
                      subtitle={`${n.placeCount} places`}
                      onClick={() => recordAndNavigate(`/neighborhoods/${n.slug}`)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
