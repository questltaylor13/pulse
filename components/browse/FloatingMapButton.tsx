"use client";

import Link from "next/link";

export default function FloatingMapButton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-modal flex justify-center">
      <Link
        href="./map"
        className="pointer-events-auto flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-body font-medium text-surface shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
          <path d="M8 2v16" />
          <path d="M16 6v16" />
        </svg>
        View on map
      </Link>
    </div>
  );
}
