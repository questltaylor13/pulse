"use client";

// Wave 5 — the following feed. Infinite-scrolls the existing cursor-paginated
// /api/feed/following.
//
// Every ranked row renders from the entry as it is *now* (the API hydrates at
// read time), so a followed user re-sorting their list changes what this shows
// on the next fetch. Nothing here caches a rank.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FollowSuggestions from "./FollowSuggestions";
import InitialThumb from "@/components/ui/InitialThumb";
import { formatAgo } from "@/lib/time/relative";
import type { FollowingFeedItemJSON } from "@/lib/social/feed";
import type { SuggestedTastemaker } from "@/lib/social/suggestions";

interface Props {
  suggestions: SuggestedTastemaker[];
  hasFollows: boolean;
}

export default function FollowingFeed({ suggestions, hasFollows }: Props) {
  const [items, setItems] = useState<FollowingFeedItemJSON[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Starts true: the first fetch is dispatched from a mount effect, so a false
  // here would paint an empty bordered card for a frame before "Loading…".
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // First page has landed — distinguishes "still loading" from "genuinely empty".
  const [loaded, setLoaded] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing again while a fetch is in flight.
  const fetching = useRef(false);
  // The retry button needs to bypass the `hasMore` guard, which the error path
  // has already set to false. Reading it from a ref rather than the closure is
  // what makes the button do anything at all.
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(null);

  const loadMore = useCallback(async () => {
    if (fetching.current || !hasMoreRef.current) return;
    fetching.current = true;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (cursorRef.current) qs.set("cursor", cursorRef.current);
      const res = await fetch(`/api/feed/following?${qs}`);
      if (!res.ok) {
        setError(true);
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }
      const data = await res.json();
      setItems((prev) => [...prev, ...data.activities]);
      setCursor(data.nextCursor);
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
      hasMoreRef.current = data.hasMore;
      setError(false);
    } catch {
      setError(true);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      setLoaded(true);
      setLoading(false);
      fetching.current = false;
    }
  }, []);

  /** Re-fetch from scratch — used after a follow, which changes what the feed contains. */
  const reload = useCallback(() => {
    setItems([]);
    setCursor(null);
    cursorRef.current = null;
    setHasMore(true);
    hasMoreRef.current = true;
    setError(false);
    setLoaded(false);
    fetching.current = false;
    void loadMore();
  }, [loadMore]);

  // First page.
  useEffect(() => {
    void loadMore();
  }, [loadMore]);

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

  // Genuinely empty — and no more pages to come. The `!hasMore` clause matters:
  // a page that returns zero renderable rows but a live cursor must not park us
  // on the empty state, because this branch unmounts the sentinel and the
  // observer would never re-arm.
  if (loaded && items.length === 0 && !error && !hasMore) {
    return (
      <FollowSuggestions
        suggestions={suggestions}
        hasFollows={hasFollows}
        onFollowed={reload}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="divide-y divide-mute-divider overflow-hidden rounded-card border border-mute-divider bg-surface">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {error && (
        <p className="py-4 text-center text-sm text-mute">
          Couldn&apos;t load the feed.{" "}
          <button
            type="button"
            className="font-medium text-coral underline"
            onClick={() => {
              setError(false);
              setHasMore(true);
              hasMoreRef.current = true;
              void loadMore();
            }}
          >
            Try again
          </button>
        </p>
      )}

      {loading && <p className="py-4 text-center text-sm text-mute">Loading…</p>}

      <div ref={sentinel} aria-hidden />
    </div>
  );
}

function ActivityRow({ item }: { item: FollowingFeedItemJSON }) {
  // A user with neither name nor username would otherwise render "@null".
  const who = item.user.name ?? (item.user.username ? `@${item.user.username}` : "Someone");
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

          {item.rankedEntry && (
            <RankedCard entry={item.rankedEntry} owner={item.user} />
          )}

          <p className="mt-1 text-xs text-mute">{formatAgo(item.createdAt)}</p>
        </div>
      </div>
    </li>
  );
}

function RankedCard({
  entry,
  owner,
}: {
  entry: NonNullable<FollowingFeedItemJSON["rankedEntry"]>;
  owner: FollowingFeedItemJSON["user"];
}) {
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

/** Only taste events reach the feed (D2), so only taste events need a summary. */
function summarize(item: FollowingFeedItemJSON): string {
  switch (item.type) {
    case "RANKED_ITEM":
      return "ranked a spot";
    case "CREATED_LIST":
      return item.list ? `created “${item.list.name}”` : "created a list";
    default:
      return "was active";
  }
}
