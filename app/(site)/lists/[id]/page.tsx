"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";

interface ListEvent {
  id: string;
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
  appleRating: number | null;
  appleRatingCount: number | null;
  addedAt: string;
}

interface ListUser {
  id: string;
  username: string | null;
  name: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
}

interface ListData {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  template: string | null;
  shareSlug: string | null;
  isOwner: boolean;
  user: ListUser;
  items: ListEvent[];
  createdAt: string;
  updatedAt: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface ListPageProps {
  params: { id: string };
}

export default function ListDetailPage({ params }: ListPageProps) {
  const { data: session } = useSession();
  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchList() {
      try {
        const response = await fetch(`/api/lists/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("List not found");
          } else {
            throw new Error("Failed to fetch list");
          }
          return;
        }
        const data = await response.json();
        setList(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchList();
  }, [params.id]);

  const handleCopyLink = async () => {
    if (!list) return;
    const url = `${window.location.origin}/lists/${list.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveEvent = async (eventId: string) => {
    if (!list) return;

    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, action: "remove" }),
      });

      if (response.ok) {
        setList((prev) =>
          prev
            ? { ...prev, items: prev.items.filter((item) => item.id !== eventId) }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to remove event:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {error || "List not found"}
        </h2>
        <p className="text-slate-600 mb-4">
          This list doesn&apos;t exist or is private.
        </p>
        <Link href="/feed" className="btn-primary">
          Go to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{list.name}</h1>
              {list.isPublic && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Public
                </span>
              )}
            </div>
            {list.description && (
              <p className="text-slate-600 mb-4">{list.description}</p>
            )}

            {/* Author */}
            <Link
              href={list.user.username ? `/u/${list.user.username}` : "#"}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition"
            >
              <div className="relative h-6 w-6 rounded-full overflow-hidden bg-slate-100">
                {list.user.profileImageUrl ? (
                  <Image
                    src={list.user.profileImageUrl}
                    alt={list.user.name || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    {(list.user.name || list.user.username || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span>
                by {list.user.name || `@${list.user.username}`}
                {list.user.isInfluencer && (
                  <svg
                    className="inline h-3 w-3 ml-1 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </span>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {list.isPublic && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            {list.isOwner && (
              <Link
                href={`/lists/${list.id}/edit`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-sm text-slate-500">
          <span>{list.items.length} event{list.items.length !== 1 ? "s" : ""}</span>
          <span>Updated {formatDate(list.updatedAt)}</span>
        </div>
      </div>

      {/* Events */}
      {list.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((event) => (
            <div key={event.id} className="card relative group">
              {/* Remove button (owner only) */}
              {list.isOwner && (
                <button
                  onClick={() => handleRemoveEvent(event.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Category & Neighborhood */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}>
                  {CATEGORY_LABELS[event.category]}
                </span>
                {event.neighborhood && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {event.neighborhood}
                  </span>
                )}
              </div>

              {/* Title */}
              <Link href={`/events/${event.id}`}>
                <h3 className="font-semibold text-slate-900 mb-1 hover:text-primary transition line-clamp-2">
                  {event.title}
                </h3>
              </Link>

              {/* Details */}
              <div className="text-sm text-slate-500 space-y-1">
                <p>{formatDate(event.startTime)}</p>
                <p className="line-clamp-1">{event.venueName}</p>
                <p>{event.priceRange}</p>
              </div>

              {/* Ratings */}
              {(event.googleRating || event.appleRating) && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {event.googleRating && (
                    <span className="text-slate-500">
                      {event.googleRating.toFixed(1)} ⭐
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-slate-500 mb-4">This list is empty.</p>
          {list.isOwner && (
            <Link href="/feed" className="btn-primary">
              Browse Events
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
