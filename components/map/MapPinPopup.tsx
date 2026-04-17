"use client";

import Image from "next/image";
import Link from "next/link";
import type { BrowseItem } from "@/lib/browse/fetch-browse";

interface Props {
  item: BrowseItem;
  onClose: () => void;
}

function itemHref(item: BrowseItem): string {
  switch (item.kind) {
    case "event":
      return `/events/${item.id}`;
    case "place":
      return `/places/${item.id}`;
    case "guide":
      return `/guides/${item.id}`;
    default:
      return "#";
  }
}

export default function MapPinPopup({ item, onClose }: Props) {
  return (
    <div className="fixed inset-x-4 bottom-28 z-modal mx-auto max-w-md">
      <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-lg">
        {/* Image */}
        <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-card bg-mute-hush">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="60px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-mute-soft">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{item.title}</p>
          {item.subtitle && (
            <p className="mt-0.5 truncate text-[12px] text-mute">{item.subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            onClick={onClose}
            className="text-mute hover:text-ink"
            aria-label="Close"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 5l14 14" />
              <path d="M19 5 5 19" />
            </svg>
          </button>
          <Link
            href={itemHref(item)}
            className="rounded-pill bg-coral px-3 py-1 text-meta font-semibold text-surface"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
