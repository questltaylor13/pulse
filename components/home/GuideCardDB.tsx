"use client";

import Link from "next/link";
import Image from "next/image";
import type { GuideCompact } from "@/lib/home/types";
import SaveButton from "./SaveButton";

interface Props {
  guide: GuideCompact;
}

export default function GuideCardDB({ guide }: Props) {
  return (
    <div className="relative shrink-0 snap-start" style={{ width: 260 }}>
      <Link
        href={`/guides/${guide.slug}`}
        className="block overflow-hidden rounded-card border border-mute-divider bg-surface"
      >
        {/* Cover image */}
        <div className="relative h-[170px] w-full bg-mute-hush">
          {guide.coverImageUrl && (
            <Image
              src={guide.coverImageUrl}
              alt=""
              fill
              sizes="260px"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
          {/* Stops count badge */}
          <div className="absolute right-3 top-3 rounded-pill bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-ink backdrop-blur">
            {guide.stopsCount} stops
          </div>
          {/* Title + tagline */}
          <div className="absolute inset-x-3 bottom-3">
            <h3 className="line-clamp-2 text-[16px] font-medium text-surface">
              {guide.title}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[12px] text-surface/85">
              {guide.tagline}
            </p>
          </div>
        </div>
        {/* Creator row */}
        <div className="flex items-center gap-2 p-3">
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-mute-hush">
            {guide.creator.profileImageUrl && (
              <Image
                src={guide.creator.profileImageUrl}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            )}
          </div>
          <span className="text-[12px] font-medium text-ink">
            {guide.creator.displayName}
          </span>
          <span className="text-[12px] text-mute">
            &middot; {guide.creator.label}
          </span>
        </div>
      </Link>
      <SaveButton itemId={guide.id} itemType="guide" />
    </div>
  );
}
