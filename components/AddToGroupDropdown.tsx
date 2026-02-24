"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface UserGroup {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
}

interface AddToGroupDropdownProps {
  itemId: string;
  itemType: "event" | "place";
  onSuccess?: () => void;
  variant?: "default" | "compact";
}

export default function AddToGroupDropdown({
  itemId,
  itemType,
  onSuccess,
  variant = "default",
}: AddToGroupDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGroups = async () => {
    if (groups.length > 0) return; // Skip if already loaded
    setLoading(true);
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      fetchGroups();
    }
    setShowDropdown(!showDropdown);
  };

  const handleAddToGroup = async (groupId: string) => {
    setAddingToGroupId(groupId);
    try {
      const action = itemType === "event" ? "suggest_event" : "suggest_place";
      const bodyKey = itemType === "event" ? "eventId" : "placeId";

      const response = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, [bodyKey]: itemId }),
      });

      if (response.ok) {
        setFeedback("Suggested!");
        onSuccess?.();
        setTimeout(() => {
          setFeedback(null);
          setShowDropdown(false);
        }, 1500);
      } else {
        const data = await response.json();
        if (data.error?.includes("already suggested")) {
          setFeedback("Already suggested");
        } else {
          setFeedback(data.error || "Failed");
        }
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch {
      setFeedback("Failed");
      setTimeout(() => setFeedback(null), 2000);
    } finally {
      setAddingToGroupId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200 transition"
        title="Add to group"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute bottom-full left-0 mb-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
          {/* Feedback toast */}
          {feedback && (
            <div className="px-3 py-2 text-sm text-green-600 font-medium">
              {feedback}
            </div>
          )}

          {/* Groups list */}
          {!feedback && (
            <>
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
              ) : groups.length === 0 ? (
                <div className="px-3 py-2">
                  <p className="text-sm text-slate-500 mb-2">No groups yet</p>
                  <Link
                    href="/groups/new"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setShowDropdown(false)}
                  >
                    Create a group
                  </Link>
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase">
                    Add to group
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => handleAddToGroup(group.id)}
                        disabled={addingToGroupId === group.id}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>{group.emoji}</span>
                        <span className="truncate flex-1">{group.name}</span>
                        {addingToGroupId === group.id && (
                          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <Link
                      href="/groups/new"
                      className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-slate-50"
                      onClick={() => setShowDropdown(false)}
                    >
                      + Create new group
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
