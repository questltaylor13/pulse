"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import SignOutButton from "@/components/SignOutButton";

export default function AuthActions() {
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
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

  // Check if user is a creator
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/curator")
        .then((res) => res.json())
        .then((data) => {
          setIsCreator(data.isCreator === true);
        })
        .catch(() => setIsCreator(false));
    }
  }, [session?.user?.id]);

  if (status === "loading") {
    return (
      <div className="h-9 w-20 animate-pulse rounded-md bg-slate-100" />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Sign in
      </Link>
    );
  }

  const displayName = session.user.name || session.user.email;
  const username = session.user.username;

  return (
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <Link
        href="/feed"
        className="font-medium text-slate-600 transition hover:text-slate-900"
      >
        Feed
      </Link>
      <Link
        href="/community"
        className="font-medium text-slate-600 transition hover:text-slate-900"
      >
        Community
      </Link>
      <Link
        href="/lists/want"
        className="font-medium text-slate-600 transition hover:text-slate-900"
      >
        Lists
      </Link>
      <Link
        href="/groups"
        className="font-medium text-slate-600 transition hover:text-slate-900"
      >
        Groups
      </Link>

      {/* Profile Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {displayName?.[0]?.toUpperCase() || "?"}
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-slate-200 py-2 z-50">
            {/* User Info */}
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="font-medium text-slate-900 truncate">{displayName}</p>
              {username && (
                <p className="text-sm text-slate-500">@{username}</p>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {username ? (
                <Link
                  href={`/u/${username}`}
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setShowDropdown(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </Link>
              ) : (
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setShowDropdown(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Set Up Profile
                </Link>
              )}
              <Link
                href="/community/badges"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                My Badges
              </Link>
              <Link
                href="/stats"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Stats
              </Link>
              <Link
                href="/plans"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Plans
              </Link>
              <Link
                href="/settings/preferences"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                onClick={() => setShowDropdown(false)}
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
            </div>

            {/* Curator Section */}
            {isCreator && (
              <div className="border-t border-slate-100 py-1">
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Curator</p>
                </div>
                <Link
                  href="/curator"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setShowDropdown(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  href="/curator/events"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setShowDropdown(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  My Events
                </Link>
                <Link
                  href="/curator/events/new"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition"
                  onClick={() => setShowDropdown(false)}
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Event
                </Link>
              </div>
            )}

            {/* Sign Out */}
            <div className="border-t border-slate-100 pt-1">
              <div className="px-4 py-2">
                <SignOutButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
