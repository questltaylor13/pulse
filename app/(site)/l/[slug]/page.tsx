"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Category } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";
import ShareModal from "@/components/ShareModal";

interface ListItem {
  id: string;
  listItemId: string;
  order: number;
  notes: string | null;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string | null;
  startTime: string;
  endTime: string | null;
  priceRange: string;
  source: string;
  sourceUrl: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
}

interface ListData {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  template: string | null;
  shareSlug: string;
  viewCount: number;
  saveCount: number;
  isOwner: boolean;
  creator: {
    id: string;
    username: string | null;
    name: string | null;
    profileImageUrl: string | null;
    isInfluencer: boolean;
  };
  items: ListItem[];
  summary: {
    itemCount: number;
    neighborhoods: string[];
    freeCount: number;
  };
  createdAt: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PublicListPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession();
  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchList();
  }, [params.slug]);

  const fetchList = async () => {
    try {
      const response = await fetch(`/api/lists/public/${params.slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("List not found");
        } else {
          setError("Failed to load list");
        }
        return;
      }
      const data = await response.json();
      setList(data);
    } catch (err) {
      setError("Failed to load list");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveList = async () => {
    if (!session || !list) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_copy" }),
      });
      if (response.ok) {
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to save list:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">List Not Found</h1>
        <p className="mb-6 text-slate-600">This list may have been removed or made private.</p>
        <Link href="/feed" className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90">
          Explore Events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-bold text-primary">
            Pulse
          </Link>
          <div className="flex items-center gap-2">
            {!list.isOwner && session && !saved && (
              <button
                onClick={handleSaveList}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to My Lists"}
              </button>
            )}
            {saved && (
              <span className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                Saved!
              </span>
            )}
            <button
              onClick={handleShare}
              className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={typeof window !== "undefined" ? window.location.href : `https://pulse.app/l/${list.shareSlug}`}
        title={list.name}
        description={list.description || undefined}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* List Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">{list.name}</h1>
          {list.description && (
            <p className="mb-4 text-lg text-slate-600">{list.description}</p>
          )}

          {/* Creator Info */}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Curated by</span>
            {list.creator.profileImageUrl ? (
              <img
                src={list.creator.profileImageUrl}
                alt={list.creator.name || list.creator.username || ""}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                {(list.creator.name || list.creator.username || "?")[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700">
              {list.creator.name || list.creator.username || "Anonymous"}
            </span>
            {list.creator.isInfluencer && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                Curator
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
            <span>{list.summary.itemCount} {list.summary.itemCount === 1 ? "spot" : "spots"}</span>
            <span className="text-slate-300">|</span>
            <span>{list.viewCount} views</span>
            {list.saveCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span>{list.saveCount} saves</span>
              </>
            )}
          </div>

          {/* Neighborhoods */}
          {list.summary.neighborhoods.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {list.summary.neighborhoods.map((neighborhood) => (
                <span
                  key={neighborhood}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {neighborhood}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Event List */}
        <div className="space-y-4">
          {list.items.map((item, index) => (
            <Link
              key={item.id}
              href={`/events/${item.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Number */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Category Badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    {item.neighborhood && (
                      <span className="text-xs text-slate-500">{item.neighborhood}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="mb-1 font-semibold text-slate-900">{item.title}</h3>

                  {/* Description */}
                  <p className="mb-3 text-sm text-slate-600 line-clamp-2">{item.description}</p>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.venueName}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(item.startTime)} at {formatTime(item.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.priceRange}
                    </span>
                    {item.googleRating && (
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {item.googleRating.toFixed(1)}
                        {item.googleRatingCount && (
                          <span className="text-slate-400">({item.googleRatingCount.toLocaleString()})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {list.items.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">This list is empty</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 p-8 text-center text-white">
          <h2 className="mb-2 text-xl font-bold">Discover more in Denver</h2>
          <p className="mb-4 text-white/80">Sign up for Pulse to get personalized recommendations</p>
          <Link
            href="/auth/signup"
            className="inline-block rounded-lg bg-white px-6 py-2 font-semibold text-primary hover:bg-white/90"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
