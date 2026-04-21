import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/constants/categories";
import type { DiscoverySource, DiscoverySubtype } from "@prisma/client";

// PRD 3 Phase 5 — Discovery detail page.
// Source-attribution rules (PRD §5.4):
//   REDDIT       → "Originally mentioned on r/<subreddit>" + link
//   LLM_RESEARCH → "Further reading" list of source URLs
//   NICHE_SITE   → "Surfaced from <site name>" + direct link
//   EDITORIAL    → "Curated by Pulse"

const SUBTYPE_LABEL: Record<DiscoverySubtype, string> = {
  HIDDEN_GEM: "Hidden spot",
  NICHE_ACTIVITY: "Club / league",
  SEASONAL_TIP: "Seasonal tip",
};

function sourceAttribution(source: DiscoverySource, sourceUrl: string | null) {
  switch (source) {
    case "REDDIT": {
      const subMatch = sourceUrl?.match(/reddit\.com\/r\/([^/]+)/i);
      const sub = subMatch?.[1] ?? null;
      return {
        label: sub ? `Originally mentioned on r/${sub}` : "From Reddit",
        href: sourceUrl,
      };
    }
    case "LLM_RESEARCH":
      return { label: "Surfaced via research", href: sourceUrl };
    case "NICHE_SITE":
      return { label: "From a local source", href: sourceUrl };
    case "EDITORIAL":
      return { label: "Curated by Pulse", href: null };
    case "COMMUNITY":
      return { label: "Community submission", href: sourceUrl };
    default:
      return { label: "Source", href: sourceUrl };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscoveryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const gem = await prisma.discovery.findUnique({ where: { id } });
  if (!gem || gem.status === "ARCHIVED") notFound();

  const attribution = sourceAttribution(gem.sourceType, gem.sourceUrl);
  const locationLine = [gem.neighborhood, gem.townName].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <nav className="text-sm text-slate-500">
        <Link href="/discoveries" className="hover:text-slate-800">
          ← Hidden Gems
        </Link>
      </nav>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
            ✦ Hidden Gem
          </span>
          <span className="text-xs font-medium text-slate-500">
            {SUBTYPE_LABEL[gem.subtype]}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[gem.category] ?? "bg-slate-100 text-slate-700"}`}
          >
            {CATEGORY_EMOJI[gem.category]} {CATEGORY_LABELS[gem.category]}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {gem.title}
        </h1>
        {locationLine && (
          <p className="text-sm text-slate-600">{locationLine}</p>
        )}
        {gem.seasonHint && (
          <p className="text-sm text-amber-700">{gem.seasonHint}</p>
        )}
      </header>

      <section>
        <p className="text-lg leading-relaxed text-slate-800 whitespace-pre-line">
          {gem.description}
        </p>
      </section>

      {gem.tags.length > 0 && (
        <section>
          <div className="flex flex-wrap gap-2">
            {gem.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-medium text-slate-700">{attribution.label}</div>
        {attribution.href && (
          <a
            href={attribution.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block break-all text-amber-700 hover:underline"
          >
            {attribution.href}
          </a>
        )}
      </section>
    </article>
  );
}
