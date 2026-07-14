"use client";

// Wave 5 — the following feed. Infinite-scrolls the existing cursor-paginated
// /api/feed/following.
//
// Every ranked row renders from the entry as it is *now* (the API hydrates at
// read time), so a followed user re-sorting their list changes what this shows
// on the next fetch. Nothing here caches a rank.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ActivityType } from "@prisma/client";
import FollowSuggestions from "./FollowSuggestions";
import InitialThumb from "@/components/ui/InitialThumb";
import type { SuggestedTastemaker } from "@/lib/social/suggestions";

interface FeedUser {
  id: string;
  username: string | null;
  name: string | null;
  profileImageUrl: string | null;
  isInfluencer: boolean;
}

interface RankedEntry {
  entryId: string;
  rank: number;
  categorySize: number;
  categoryLabel: string;
  categorySlug: string;
  title: string;
  imageUrl: string | null;
  town: string | null;
  note: string | null;
  score: number;
  href: string | null;
}

interface FeedItem {
  id: string;
  type: ActivityType;
  user: FeedUser;
  list: { id: string; name: string } | null;
  targetUser: { id: string; username: string | null; name: string | null } | null;
  rankedEntry: RankedEntry | null;
  createdAt: string;
}

interface Props {
  suggestions: SuggestedTastemaker[];
  hasFollows: boolean;
}

export default function FollowingFeed({ suggestions, hasFollows }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // First page has landed — distinguishes "still loading" from "genuinely empty".
  const [loaded, setLoaded] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing again while a fetch is in flight.
  const fetching = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetching.current || !hasMore) return;
    fetching.current = true;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (cursor) qs.set("cursor", cursor);
      const res = await fetch(`/api/feed/following?${qs}`);
      if (!res.ok) {
        setError(true);
        setHasMore(false);
        return;
      }
      const data = await res.json();
      setItems((prev) => [...prev, ...data.activities]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setError(false);
    } catch {
      setError(true);
      setHasMore(false);
    } finally {
      setLoaded(true);
      setLoading(false);
      fetching.current = false;
    }
  }, [cursor, hasMore]);

  // First page.
  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent pages on scroll.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  if (loaded && items.length === 0 && !error) {
    return <FollowSuggestions suggestions={suggestions} hasFollows={hasFollows} />;
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-mute-divider overflow-hidden rounded-card border border-mute-divider bg-surface">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>

      {error && (
        <p className="py-4 text-center text-sm text-mute">
          Couldn&apos;t load the feed.{" "}
          <button
            type="button"
            className="font-medium text-coral underline"
            onClick={() => {
              setError(false);
              setHasMore(true);
              void loadMore();
            }}
          >
            Try again
          </button>
        </p>
      )}

      {loading && (
        <p className="py-4 text-center text-sm text-mute">Loading…</p>
      )}

      <div ref={sentinel} aria-hidden />
    </div>
  );
}

function ActivityRow({ item }: { item: FeedItem }) {
  const who = item.user.name ?? `@${item.user.username}`;
  const profileHref = item.user.username ? `/u/${item.user.username}` : null;

  const avatar = (
    <InitialThumb
      src={item.user.profileImageUrl}
      title={who.replace("@", "")}
      className="h-9 w-9 rounded-full"
      initialClassName="text-xs"
    />
  );

  return (
    <li className="p-3">
      <div className="flex gap-3">
        {profileHref ? <Link href={profileHref}>{avatar}</Link> : avatar}

        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">
            {profileHref ? (
              <Link href={profileHref} className="font-medium hover:underline">
                {who}
              </Link>
            ) : (
              <span className="font-medium">{who}</span>
            )}{" "}
            <span className="text-mute">{summarize(item)}</span>
          </p>

          {item.rankedEntry && <RankedCard entry={item.rankedEntry} owner={item.user} />}

          <p className="mt-1 text-xs text-mute">{timeAgo(item.createdAt)}</p>
        </div>
      </div>
    </li>
  );
}

function RankedCard({ entry, owner }: { entry: RankedEntry; owner: FeedUser }) {
  const body = (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-mute-divider p-2 transition hover:bg-slate-50">
      <InitialThumb src={entry.imageUrl} title={entry.title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
        <p className="truncate text-xs text-mute">
          {/* Rank is meaningless without its denominator. */}
          #{entry.rank} of {entry.categorySize} in {entry.categoryLabel}
          {entry.town ? ` · ${entry.town}` : ""}
        </p>
        {entry.note && (
          <p className="mt-0.5 line-clamp-1 text-xs italic text-mute">
            “{entry.note}”
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {entry.href ? <Link href={entry.href}>{body}</Link> : body}
      {owner.username && (
        <Link
          href={`/u/${owner.username}/rankings/${entry.categorySlug}`}
          className="mt-1 inline-block text-xs font-medium text-coral hover:underline"
        >
          See their full {entry.categoryLabel} list →
        </Link>
      )}
    </>
  );
}

function summarize(item: FeedItem): string {
  switch (item.type) {
    case "RANKED_ITEM":
      return "ranked a spot";
    case "CREATED_LIST":
      return item.list ? `created “${item.list.name}”` : "created a list";
    case "ADDED_TO_LIST":
      return item.list ? `added to “${item.list.name}”` : "added to a list";
    case "FOLLOWED_USER": {
      const target = item.targetUser?.name ?? item.targetUser?.username;
      return target ? `followed ${target}` : "followed someone";
    }
    default:
      return "was active";
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
