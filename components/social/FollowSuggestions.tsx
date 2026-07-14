"use client";

// Wave 5 — the following feed's empty state, as a discovery surface rather
// than an apology. "No activity yet" is a dead end; a list of people whose
// taste you can actually see is a next step.

import Link from "next/link";
import FollowButton from "./FollowButton";
import InitialThumb from "@/components/ui/InitialThumb";
import type { SuggestedTastemaker } from "@/lib/social/suggestions";

interface Props {
  suggestions: SuggestedTastemaker[];
  /** True when the viewer follows people but none of them have ranked anything. */
  hasFollows: boolean;
  /**
   * Re-fetch the feed. Required, not optional: this component IS the empty
   * state, so a follow made from here has to tell the feed to look again.
   * router.refresh() cannot do it — it preserves client component state, so the
   * feed would sit on its cached empty result until a hard reload.
   */
  onFollowed: () => void;
}

export default function FollowSuggestions({
  suggestions,
  hasFollows,
  onFollowed,
}: Props) {
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
              <SuggestionRow key={s.id} user={s} onFollowed={onFollowed} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SuggestionRow({
  user,
  onFollowed,
}: {
  user: SuggestedTastemaker;
  onFollowed: () => void;
}) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Link
        href={`/u/${user.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <InitialThumb
          src={user.profileImageUrl}
          title={user.name ?? user.username}
          className="h-10 w-10 rounded-full"
          initialClassName="text-sm"
        />
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
      <FollowButton
        userId={user.id}
        onToggled={(following) => {
          // Their rankings are now eligible for the feed — go get them.
          if (following) onFollowed();
        }}
      />
    </li>
  );
}
