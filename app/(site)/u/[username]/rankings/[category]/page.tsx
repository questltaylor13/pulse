import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicRankings } from "@/lib/rank-engine/service";
import { rankCategoryFromSlug } from "@/lib/rank-engine/categories";
import { isRateRankEnabled } from "@/lib/ranking/flags";
import RankedListRow from "@/components/rank/RankedListRow";

// Wave 4 Rate & Rank — the public, shareable ranked list (decision D7):
// "Quest's Top Restaurants in Denver". Auto-updates as the owner rates.
// Confirmed entries only, top 25, 404 when private/empty/unknown.

export const dynamic = "force-dynamic";

interface PageProps {
  params: { username: string; category: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const category = rankCategoryFromSlug(params.category);
  if (!category || !isRateRankEnabled()) return {};
  const data = await fetchPublicRankings(params.username, category);
  if (!data) return {};
  const owner = data.user.name ?? `@${data.user.username}`;
  const title = `${owner}'s Top ${data.category.label} in Denver`;
  return {
    title,
    description: `${data.category.total} ${data.category.label.toLowerCase()} ranked on Pulse — updated with every rating.`,
    openGraph: {
      title: `${title} · Pulse`,
      description: `${data.category.total} spots, ranked. See the full list on Pulse.`,
      ...(data.category.entries[0]?.imageUrl
        ? { images: [{ url: data.category.entries[0].imageUrl }] }
        : {}),
    },
  };
}

export default async function PublicRankingsPage({ params }: PageProps) {
  if (!isRateRankEnabled()) notFound();

  const category = rankCategoryFromSlug(params.category);
  if (!category) notFound();

  const data = await fetchPublicRankings(params.username, category);
  if (!data) notFound();

  const owner = data.user.name ?? `@${data.user.username}`;
  const hero = data.category.entries[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Cover header from the #1 spot */}
      <header className="relative overflow-hidden rounded-card border border-mute-divider">
        <div className="relative h-40 bg-mute-hush">
          {hero?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-teal-soft via-surface to-coral/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2">
              {data.user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.user.profileImageUrl}
                  alt=""
                  className="h-7 w-7 rounded-full border border-white/60 object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-xs font-bold text-white">
                  {owner.charAt(0).toUpperCase()}
                </span>
              )}
              <Link
                href={`/u/${data.user.username}`}
                className="text-sm font-medium text-white/90 hover:underline"
              >
                {owner}
              </Link>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Top {data.category.label} in Denver
            </h1>
            <p className="text-xs text-white/80">
              {data.category.total} ranked · updates with every rating
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-card border border-mute-divider bg-surface">
        <ul className="px-4">
          {data.category.entries.map((entry) => (
            <RankedListRow key={entry.entryId} entry={entry} canEdit={false} />
          ))}
        </ul>
        {data.moreCount > 0 && (
          <p className="border-t border-mute-divider px-4 py-3 text-center text-xs text-mute">
            …and {data.moreCount} more
          </p>
        )}
      </section>

      <footer className="rounded-card border border-mute-divider bg-teal-soft/30 p-5 text-center">
        <p className="text-sm font-medium text-ink">
          Build your own ranked lists of Denver&apos;s best
        </p>
        <p className="mt-0.5 text-xs text-mute">
          Rate the places you&apos;ve been — Pulse turns them into your
          personal top list.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90"
        >
          Explore Pulse
        </Link>
      </footer>
    </div>
  );
}
