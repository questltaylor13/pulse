import Link from "next/link";
import type { Discovery, DiscoverySubtype, ItemStatus } from "@prisma/client";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/constants/categories";
import CardMoreMenu from "@/components/feedback/CardMoreMenu";
import FeedbackTag from "@/components/feedback/FeedbackTag";

// PRD 3 Phase 5 — Hidden Gems card.
// Distinct visual tell so users know this isn't a typical listing: amber
// "Hidden Gem" badge top-left, subtype chip top-right, Pulse-voice
// description front-and-center. Links to the Discovery detail page, not an
// Event or Place.

export type DiscoveryCardData = Pick<
  Discovery,
  | "id"
  | "title"
  | "description"
  | "subtype"
  | "category"
  | "neighborhood"
  | "townName"
  | "region"
  | "seasonHint"
  | "sourceType"
  | "qualityScore"
  | "tags"
>;

const SUBTYPE_LABEL: Record<DiscoverySubtype, string> = {
  HIDDEN_GEM: "Spot",
  NICHE_ACTIVITY: "Club / League",
  SEASONAL_TIP: "Seasonal",
};

const REGION_LABEL: Record<string, string> = {
  DENVER_METRO: "Denver",
  FRONT_RANGE: "Front Range",
  MOUNTAIN_GATEWAY: "Mountain Gateway",
  MOUNTAIN_DEST: "Mountain Destination",
};

interface Props {
  gem: DiscoveryCardData;
  feedbackStatus?: ItemStatus | null;
}

export default function DiscoveryCard({ gem, feedbackStatus = null }: Props) {
  const locationLine = [gem.neighborhood, gem.townName]
    .filter(Boolean)
    .join(" · ");
  const regionLabel = REGION_LABEL[gem.region] ?? gem.region;

  return (
    <Link
      href={`/discoveries/${gem.id}`}
      className="relative block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md"
    >
      <CardMoreMenu
        ref_={{ discoveryId: gem.id }}
        itemTitle={gem.title}
        shareUrl={`/discoveries/${gem.id}`}
        initialStatus={feedbackStatus}
      />
      <div className="flex items-start justify-between gap-3 pl-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
          ✦ Hidden Gem
        </span>
        <span className="text-xs font-medium text-slate-500">
          {SUBTYPE_LABEL[gem.subtype]}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-slate-900 line-clamp-2">
        {gem.title}
      </h3>

      <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">{gem.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLORS[gem.category] ?? "bg-slate-100 text-slate-700"}`}
        >
          {CATEGORY_EMOJI[gem.category]} {CATEGORY_LABELS[gem.category]}
        </span>
        {locationLine && (
          <span className="text-slate-500">{locationLine}</span>
        )}
        {gem.region !== "DENVER_METRO" && (
          <span className="text-amber-700 font-medium">{regionLabel}</span>
        )}
        {gem.seasonHint && (
          <span className="text-slate-500">· {gem.seasonHint}</span>
        )}
      </div>

      {gem.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gem.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {feedbackStatus === "WANT" && (
        <div className="mt-3">
          <FeedbackTag status={feedbackStatus} />
        </div>
      )}
    </Link>
  );
}
