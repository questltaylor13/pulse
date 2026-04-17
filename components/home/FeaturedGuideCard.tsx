import Link from "next/link";
import Image from "next/image";
import type { GuideCompact } from "@/lib/home/types";

interface Props {
  guide: GuideCompact;
}

export default function FeaturedGuideCard({ guide }: Props) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="block overflow-hidden rounded-card border border-mute-divider bg-surface"
    >
      {/* Cover image */}
      <div className="relative h-[220px] w-full bg-mute-hush">
        {guide.coverImageUrl && (
          <Image
            src={guide.coverImageUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Editor's pick badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-pill bg-ink/80 px-2.5 py-1 backdrop-blur">
          <span className="text-[11px]">&#9733;</span>
          <span className="text-[11px] font-medium text-surface">
            Editor&apos;s pick
          </span>
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        <div className="absolute inset-x-4 bottom-4">
          <h3 className="line-clamp-2 text-[20px] font-medium leading-snug text-surface">
            {guide.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-white/85">
            {guide.tagline}
          </p>
        </div>
      </div>

      {/* Below image info */}
      <div className="px-4 py-3">
        {/* Creator row */}
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-mute-hush">
            {guide.creator.profileImageUrl && (
              <Image
                src={guide.creator.profileImageUrl}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            )}
          </div>
          <span className="text-[13px] font-medium text-ink">
            {guide.creator.displayName}
          </span>
          <span className="text-[12px] text-mute">
            &middot; {guide.creator.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-mute">
          <span>{guide.durationLabel}</span>
          <span>&middot;</span>
          <span>{guide.stopsCount} stops</span>
          <span>&middot;</span>
          <span>{guide.costRangeLabel}</span>
        </div>
      </div>
    </Link>
  );
}
