"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toggleWant, toggleDone } from "@/lib/actions/lists";

interface UserList {
  id: string;
  name: string;
  emoji?: string;
  isDefault: boolean;
  itemCount?: number;
}

interface SaveToListDropdownProps {
  eventId?: string;
  placeId?: string;
  itemType: "event" | "place";
  currentStatus?: "WANT" | "DONE" | null;
  onStatusChange?: (status: "WANT" | "DONE" | null) => void;
  size?: "sm" | "md";
}

export default function SaveToListDropdown({
  eventId,
  placeId,
  itemType,
  currentStatus,
  onStatusChange,
  size = "md",
}: SaveToListDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<"WANT" | "DONE" | null>(currentStatus || null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const itemId = eventId || placeId;

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

  const fetchLists = async () => {
    if (lists.length > 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/lists");
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      fetchLists();
    }
    setShowDropdown(!showDropdown);
  };

  const handleQuickSave = async (targetStatus: "WANT" | "DONE") => {
    if (!eventId && !placeId) return;

    try {
      if (eventId) {
        if (targetStatus === "WANT") {
          await toggleWant(eventId);
        } else {
          await toggleDone(eventId);
        }
      }
      // For places, would use different actions

      const newStatus = status === targetStatus ? null : targetStatus;
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      setFeedback(newStatus ? (targetStatus === "WANT" ? "Saved!" : "Marked done!") : "Removed");
      setTimeout(() => {
        setFeedback(null);
        setShowDropdown(false);
      }, 1200);
    } catch {
      setFeedback("Failed");
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!itemId) return;
    setAddingToListId(listId);

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          itemType === "event" ? { eventId: itemId } : { placeId: itemId }
        ),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.action === "already_added" ? "Already in list" : "Added!");
        setTimeout(() => {
          setFeedback(null);
          setShowDropdown(false);
        }, 1200);
      } else {
        setFeedback("Failed to add");
        setTimeout(() => setFeedback(null), 1500);
      }
    } catch {
      setFeedback("Failed");
      setTimeout(() => setFeedback(null), 1500);
    } finally {
      setAddingToListId(null);
    }
  };

  const buttonClasses = size === "sm"
    ? "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition"
    : "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Save Button */}
      <button
        onClick={handleToggleDropdown}
        className={`${buttonClasses} ${
          status === "WANT"
            ? "bg-primary text-white hover:bg-primary-dark"
            : status === "DONE"
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <svg
          className="h-4 w-4"
          fill={status ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {status === "WANT" ? "Saved" : status === "DONE" ? "Done" : "Save"}
        <svg className="h-3 w-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50">
          {/* Feedback toast */}
          {feedback && (
            <div className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 mx-2 rounded-lg mb-2">
              {feedback}
            </div>
          )}

          {!feedback && (
            <>
              {/* Quick Actions */}
              <div className="px-2 pb-2 border-b border-slate-100">
                <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase">
                  Quick Save
                </p>
                <button
                  onClick={() => handleQuickSave("WANT")}
                  className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition ${
                    status === "WANT"
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {status === "WANT" && (
                    <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={status === "WANT" ? "" : "ml-6"}>Want to Do</span>
                </button>
                <button
                  onClick={() => handleQuickSave("DONE")}
                  className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2 transition ${
                    status === "DONE"
                      ? "bg-green-50 text-green-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {status === "DONE" && (
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={status === "DONE" ? "" : "ml-6"}>Done</span>
                </button>
              </div>

              {/* Custom Lists */}
              <div className="px-2 pt-2">
                <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase">
                  Add to List
                </p>
                {loading ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
                ) : lists.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No custom lists yet
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    {lists
                      .filter((l) => !l.isDefault)
                      .map((list) => (
                        <button
                          key={list.id}
                          onClick={() => handleAddToList(list.id)}
                          disabled={addingToListId === list.id}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          <span>{list.emoji || "📋"}</span>
                          <span className="truncate flex-1">{list.name}</span>
                          {addingToListId === list.id && (
                            <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Create New List */}
              <div className="px-2 pt-2 border-t border-slate-100 mt-2">
                <Link
                  href="/lists/new"
                  className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-primary/5 rounded-lg font-medium"
                  onClick={() => setShowDropdown(false)}
                >
                  + Create New List
                </Link>
                <Link
                  href="/lists"
                  className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 rounded-lg"
                  onClick={() => setShowDropdown(false)}
                >
                  View All Lists
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
