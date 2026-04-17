"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AddFriendButton } from "@/components/AddFriendButton";

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "friends" | "blocked";

type Friend = {
  id: string;
  name: string | null;
  username: string | null;
  profileImageUrl: string | null;
};

type PendingRequest = {
  id: string;
  createdAt: string;
  requester: Friend;
};

type SearchResult = Friend & {
  friendshipStatus: FriendshipStatus;
};

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    fetchFriends();
  }, [session, status, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function fetchFriends() {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
        setPendingRequests(data.pendingRequests);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(query: string) {
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  }

  async function handleRespond(friendshipId: string, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });

      if (res.ok) {
        // Remove from pending requests
        setPendingRequests((prev) => prev.filter((r) => r.id !== friendshipId));

        // If accepted, add to friends
        if (action === "accept") {
          const request = pendingRequests.find((r) => r.id === friendshipId);
          if (request) {
            setFriends((prev) => [...prev, request.requester]);
          }
        }
      }
    } catch (error) {
      console.error("Respond failed:", error);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Friends</h1>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Friend Requests ({pendingRequests.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {request.requester.profileImageUrl ? (
                      <img
                        src={request.requester.profileImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {(request.requester.name?.[0] || request.requester.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {request.requester.name || request.requester.username}
                    </p>
                    {request.requester.username && request.requester.name && (
                      <p className="text-sm text-slate-500">@{request.requester.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(request.id, "accept")}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(request.id, "decline")}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Find Friends</h2>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
        </div>

        {searching && (
          <div className="mt-4 text-center text-slate-500">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4">
                <Link href={`/u/${user.username || user.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {(user.name?.[0] || user.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {user.name || user.username}
                    </p>
                    {user.username && user.name && (
                      <p className="text-sm text-slate-500">@{user.username}</p>
                    )}
                  </div>
                </Link>
                <AddFriendButton
                  userId={user.id}
                  initialStatus={user.friendshipStatus}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <div className="mt-4 text-center text-slate-500">No users found</div>
        )}
      </div>

      {/* Friends List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Your Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-slate-600 mb-2">No friends yet</p>
            <p className="text-sm text-slate-500">
              Search for people you know to add them as friends!
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4">
                <Link href={`/u/${friend.username || friend.id}`} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {friend.profileImageUrl ? (
                      <img
                        src={friend.profileImageUrl}
                        alt=""
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
                <AddFriendButton userId={friend.id} initialStatus="friends" size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
