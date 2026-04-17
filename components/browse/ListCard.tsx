import Link from "next/link";
import Image from "next/image";
import type { BrowseItem } from "@/lib/browse/fetch-browse";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants/categories";

interface Props {
  item: BrowseItem;
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

export default function ListCard({ item }: Props) {
  const categoryClass = item.category
    ? (CATEGORY_COLORS as Record<string, string>)[item.category] ?? "bg-slate-100 text-slate-700"
    : "bg-slate-100 text-slate-700";
  const categoryLabel = item.category
    ? (CATEGORY_LABELS as Record<string, string>)[item.category] ?? item.category
    : null;

  return (
    <Link
      href={itemHref(item)}
      className="flex gap-3 px-5 py-3 transition-colors hover:bg-mute-hush active:bg-mute-divider"
    >
      {/* Image */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-mute-hush">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-mute-soft">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {categoryLabel && (
          <span
            className={`mb-1 w-fit rounded-pill px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${categoryClass}`}
          >
            {categoryLabel}
          </span>
        )}
        <p className="truncate text-[15px] font-medium text-ink">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-[12px] text-mute">
            {item.subtitle}
          </p>
        )}
        {/* Meta badges */}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.priceRange && (
            <span
              className={`rounded-pill px-2 py-0.5 text-meta font-medium ${
                item.priceRange.toLowerCase().includes("free")
                  ? "bg-teal-soft text-teal"
                  : "bg-mute-hush text-mute"
              }`}
            >
              {item.priceRange}
            </span>
          )}
          {item.meta && (
            <span className="rounded-pill bg-mute-hush px-2 py-0.5 text-meta text-mute">
              {item.meta}
            </span>
          )}
          {item.neighborhood && (
            <span className="rounded-pill bg-mute-hush px-2 py-0.5 text-meta text-mute">
              {item.neighborhood}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
