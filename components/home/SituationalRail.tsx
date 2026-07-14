import Link from "next/link";
import { isSituationsV1Enabled } from "@/lib/ranking/flags";

/**
 * The entry point to the situational browse pages.
 *
 * This exists because the review caught that Wave 6B was about to ship three
 * pages nobody could reach — no nav enumerates BROWSE_CONFIGS, and nothing
 * linked to them. It also turned out `locals`, `groups` and `work` had been
 * orphaned the same way since they were built: SEVEN of the thirteen browse
 * configs had no entry point anywhere in the app. Fixing /browse/groups' query
 * (which returned zero places) would have been invisible without this.
 *
 * Situational pills are flag-gated because their columns are false until the
 * enrichment backfill runs. The three older ones are not — they work today.
 */

interface Situation {
  href: string;
  label: string;
  emoji: string;
}

const ALWAYS: Situation[] = [
  { href: "/browse/locals", label: "Where locals go", emoji: "📍" },
  { href: "/browse/groups", label: "Good for groups", emoji: "🍻" },
  { href: "/browse/work", label: "Work from here", emoji: "💻" },
];

const SITUATIONAL: Situation[] = [
  { href: "/browse/watch-the-game", label: "Watch the game", emoji: "📺" },
  { href: "/browse/big-groups", label: "Fits a big group", emoji: "🎉" },
  { href: "/browse/kid-friendly", label: "Good with kids", emoji: "🧸" },
];

export default function SituationalRail() {
  const situations = isSituationsV1Enabled()
    ? [...SITUATIONAL, ...ALWAYS]
    : ALWAYS;

  return (
    <section className="mt-2">
      <h2 className="px-5 text-[15px] font-medium text-ink">What are you in the mood for?</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {situations.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex shrink-0 items-center gap-1.5 rounded-pill border border-mute-hush bg-white px-3.5 py-2 text-[13px] font-medium text-ink-soft shadow-card transition-colors hover:border-teal/40 hover:text-ink"
          >
            <span aria-hidden>{s.emoji}</span>
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
