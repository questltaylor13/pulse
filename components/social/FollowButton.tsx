"use client";

// Wave 5 — the follow toggle, in one place.
//
// app/(site)/u/[username]/page.tsx had already grown this handler; the feed's
// empty state was about to grow a second copy. Same POST, same {following}
// response, same busy/disabled contract — only the styling differs, so that is
// what the props vary.
//
// Distinct from AddFriendButton, which drives the *friendship* graph
// (/api/friends/request, mutual, PENDING/ACCEPTED). Following is one-directional
// and needs no consent. Do not merge them.

import { useState } from "react";

interface Props {
  userId: string;
  initialFollowing?: boolean;
  /** Fired after a successful toggle with the new state. */
  onToggled?: (following: boolean) => void;
  className?: string;
}

export default function FollowButton({
  userId,
  initialFollowing = false,
  onToggled,
  className,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        // A silent no-op looks identical to success from the outside.
        setFailed(true);
        return;
      }
      const { following: next } = await res.json();
      setFollowing(next);
      onToggled?.(next);
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={
        className ??
        `flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          following ? "bg-mute-hush text-mute" : "bg-coral text-white hover:opacity-90"
        }`
      }
    >
      {failed ? "Try again" : following ? "Following" : "Follow"}
    </button>
  );
}
