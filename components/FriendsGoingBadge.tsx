"use client";

import { useState } from "react";
import Link from "next/link";

interface Friend {
  id: string;
  name: string | null;
  username: string | null;
  profileImageUrl: string | null;
}

interface FriendsGoingBadgeProps {
  friends: Friend[];
  size?: "sm" | "md";
}

export function FriendsGoingBadge({
  friends,
  size = "md",
}: FriendsGoingBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  if (friends.length === 0) return null;

  const avatarSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const getDisplayName = (friend: Friend) => {
    if (friend.name) {
      return friend.name.split(" ")[0];
    }
    if (friend.username) {
      return friend.username;
    }
    return "Someone";
  };

  const getText = () => {
    if (friends.length === 1) {
      return `${getDisplayName(friends[0])} is going`;
    }
    if (friends.length === 2) {
      return `${getDisplayName(friends[0])} & ${getDisplayName(friends[1])} are going`;
    }
    return `${friends.length} friends are going`;
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center text-purple-600 hover:text-purple-700 transition"
      >
        <div className="flex items-center gap-2">
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            {friends.slice(0, 3).map((friend) => (
              <div
                key={friend.id}
                className={`${avatarSize} rounded-full border-2 border-white bg-slate-200 overflow-hidden`}
              >
                {friend.profileImageUrl ? (
                  <img
                    src={friend.profileImageUrl}
                    alt={friend.name || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-600">
                    {(friend.name?.[0] || friend.username?.[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {friends.length > 3 && (
              <div
                className={`${avatarSize} rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600`}
              >
                +{friends.length - 3}
              </div>
            )}
          </div>

          {/* Text */}
          <span className={textSize}>{getText()}</span>
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Friends Going
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/u/${friend.username || friend.id}`}
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    {friend.profileImageUrl ? (
                      <img
                        src={friend.profileImageUrl}
                        alt={friend.name || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {(friend.name?.[0] || friend.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {friend.name || friend.username}
                    </p>
                    {friend.username && friend.name && (
                      <p className="text-sm text-slate-500">@{friend.username}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                {friends.length} friend{friends.length !== 1 ? "s" : ""} planning to attend
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
