"use client";

// Wave 5 — the following feed's empty state, as a discovery surface rather
// than an apology. "No activity yet" is a dead end; a list of people whose
// taste you can actually see is a next step.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SuggestedTastemaker } from "@/lib/social/suggestions";

interface Props {
  suggestions: SuggestedTastemaker[];
  /** True when the viewer follows people but none of them have ranked anything. */
  hasFollows: boolean;
}

export default function FollowSuggestions({ suggestions, hasFollows }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-mute-divider bg-surface p-6 text-center">
        <p className="text-base font-semibold text-ink">
          {hasFollows
            ? "Nothing from the people you follow yet"
            : "Follow people whose taste you trust"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
          {hasFollows
            ? "When they rank a spot, it shows up here — and their lists keep updating as they go."
            : "Their ranked lists land here as they rate, and start nudging what Pulse shows you."}
        </p>
      </div>

      {suggestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-mute">
            People with public rankings
          </h2>
          <ul className="divide-y divide-mute-divider overflow-hidden rounded-card border border-mute-divider bg-surface">
            {suggestions.map((s) => (
              <SuggestionRow key={s.id} user={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SuggestionRow({ user }: { user: SuggestedTastemaker }) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) return;
      const { following: next } = await res.json();
      setFollowing(next);
      // Their activity is now eligible for the feed above.
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center gap-3 p-3">
      <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-mute-hush">
          {user.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-soft to-coral/20 text-sm font-semibold text-ink/40">
              {(user.name ?? user.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {user.name ?? `@${user.username}`}
            {user.isInfluencer && <span className="ml-1 text-teal">✓</span>}
          </p>
          <p className="truncate text-xs text-mute">
            {user.topPick
              ? `#1 ${user.topPick.categoryLabel}: ${user.topPick.title}`
              : `${user.rankedCount} ranked`}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          following
            ? "bg-mute-hush text-mute"
            : "bg-coral text-white hover:opacity-90"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </li>
  );
}
