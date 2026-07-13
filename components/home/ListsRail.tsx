// Wave 5 — "Lists worth stealing": top public lists as a rail on the For You
// tab. The list is the shareable artifact; this is where it gets seen.
//
// Server component — links only, no interactivity. Rail chrome (header,
// see-all, snap scrolling) comes from ScrollSection like every other rail.

import Link from "next/link";
import ScrollSection from "./ScrollSection";
import type { FeaturedList } from "@/lib/social/featured-lists";

interface Props {
  lists: FeaturedList[];
}

export default function ListsRail({ lists }: Props) {
  // Callers already omit the rail when empty; belt-and-braces so this can never
  // render a titled section with nothing under it.
  if (lists.length === 0) return null;

  return (
    <ScrollSection
      title="Lists worth stealing"
      subtitle="Collections other people keep saving"
      seeAllHref="/lists"
    >
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </ScrollSection>
  );
}

function ListCard({ list }: { list: FeaturedList }) {
  // A list with no share slug has no public page to point at.
  const href = list.shareSlug ? `/l/${list.shareSlug}` : `/lists/${list.id}`;
  const creator =
    list.creator.name ??
    (list.creator.username ? `@${list.creator.username}` : "Someone");

  return (
    <Link
      href={href}
      className="w-64 flex-shrink-0 snap-start overflow-hidden rounded-card border border-mute-divider bg-surface transition hover:border-coral/40"
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-ink">
            {list.name}
          </h3>
          {/* Saves are the reason this list is on the rail — show the receipt. */}
          <span className="flex-shrink-0 rounded-pill bg-coral/10 px-2 py-0.5 text-meta font-semibold text-coral">
            {list.saveCount} {list.saveCount === 1 ? "save" : "saves"}
          </span>
        </div>

        <p className="mt-0.5 truncate text-meta text-mute">
          {creator}
          {list.creator.isInfluencer && <span className="ml-1 text-teal">✓</span>}
          {" · "}
          {list.itemCount} {list.itemCount === 1 ? "spot" : "spots"}
        </p>

        {list.previewItems.length > 0 && (
          <ol className="mt-2 space-y-1">
            {list.previewItems.map((item, i) => (
              <li
                key={`${list.id}-${i}`}
                className="flex items-center gap-2 text-meta text-mute"
              >
                {/* Rank numbers: a list is an ordered argument, not a bag. */}
                <span className="w-3 flex-shrink-0 text-right font-semibold tabular-nums text-ink/40">
                  {i + 1}
                </span>
                <span className="truncate">{item.title}</span>
              </li>
            ))}
            {list.itemCount > list.previewItems.length && (
              <li className="flex items-center gap-2 text-meta text-ink/40">
                <span className="w-3 flex-shrink-0" />
                <span>+{list.itemCount - list.previewItems.length} more</span>
              </li>
            )}
          </ol>
        )}
      </div>
    </Link>
  );
}
