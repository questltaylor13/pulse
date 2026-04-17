"use client";

import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
}

export default function SubHeader({ title, subtitle }: Props) {
  return (
    <div className="sticky top-0 z-chromeHeader border-b border-mute-divider bg-surface px-5 py-3">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-mute-hush"
          aria-label="Back"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1 px-3 text-center">
          <h1 className="truncate text-[20px] font-medium text-ink">{title}</h1>
          {subtitle && (
            <p className="truncate text-body text-mute">{subtitle}</p>
          )}
        </div>

        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-mute-hush"
          aria-label="Share"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.3 13.1l7.4 4.4" />
            <path d="M15.7 6.5l-7.4 4.4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
