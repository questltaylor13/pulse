"use client";

import { useState } from "react";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "friends" | "blocked";

interface AddFriendButtonProps {
  userId: string;
  initialStatus?: FriendshipStatus;
  size?: "sm" | "md";
  onStatusChange?: (status: FriendshipStatus) => void;
}

export function AddFriendButton({
  userId,
  initialStatus = "none",
  size = "md",
  onStatusChange,
}: AddFriendButtonProps) {
  const [status, setStatus] = useState<FriendshipStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (status === "friends" || status === "blocked") return;

    setLoading(true);
    try {
      if (status === "pending_received") {
        // Accept the request
        const friendsRes = await fetch("/api/friends");
        const friendsData = await friendsRes.json();
        const request = friendsData.pendingRequests?.find(
          (r: { requester: { id: string } }) => r.requester.id === userId
        );

        if (request) {
          const res = await fetch("/api/friends/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friendshipId: request.id, action: "accept" }),
          });

          if (res.ok) {
            setStatus("friends");
            onStatusChange?.("friends");
          }
        }
      } else {
        // Send request
        const res = await fetch("/api/friends/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = await res.json();

        if (res.ok) {
          const newStatus = data.status as FriendshipStatus;
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        }
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("none");
        onStatusChange?.("none");
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  if (status === "friends") {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`${sizeClasses} rounded-lg bg-green-100 text-green-700 font-medium flex items-center gap-1.5`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Friends
        </span>
        <button
          onClick={handleRemove}
          disabled={loading}
          className={`${sizeClasses} rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition`}
          title="Remove friend"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  if (status === "pending_sent") {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`${sizeClasses} rounded-lg bg-slate-100 text-slate-600 font-medium flex items-center gap-1.5`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pending
        </span>
        <button
          onClick={handleRemove}
          disabled={loading}
          className={`${sizeClasses} rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition`}
          title="Cancel request"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  if (status === "pending_received") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${sizeClasses} rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition flex items-center gap-1.5`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {loading ? "..." : "Accept"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${sizeClasses} rounded-lg bg-purple-100 text-purple-700 font-medium hover:bg-purple-200 transition flex items-center gap-1.5`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
      {loading ? "..." : "Add Friend"}
    </button>
  );
}
