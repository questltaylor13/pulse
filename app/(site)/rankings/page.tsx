import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchRankings } from "@/lib/rank-engine/service";
import { rankCategoryFromSlug } from "@/lib/rank-engine/categories";
import { isRateRankEnabled } from "@/lib/ranking/flags";
import RankedListRow from "@/components/rank/RankedListRow";
import CopyLinkButton from "@/components/rank/CopyLinkButton";

// Wave 4 Rate & Rank — your personal ranked lists, one tab per non-empty
// rank category. Auto-generated from the duel flow (decision D7): this page
// is a computed view over UserRankedEntry, not a manual List.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Rankings",
};

interface PageProps {
  searchParams: { category?: string };
}

export default async function RankingsPage({ searchParams }: PageProps) {
  if (!isRateRankEnabled()) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?next=/rankings");

  const [categories, user] = await Promise.all([
    fetchRankings(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, rankingsArePublic: true },
    }),
  ]);

  const requested = searchParams.category
    ? rankCategoryFromSlug(searchParams.category)
    : null;
  const active =
    categories.find((c) => c.category === requested) ?? categories[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Your Rankings
        </h1>
        <p className="text-sm text-mute">
          Built from your ratings — every “been there” duel updates these
          lists automatically.
        </p>
      </header>

      {categories.length === 0 || !active ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-surface p-8 text-center">
          <h3 className="text-base font-semibold text-ink">
            Nothing ranked yet
          </h3>
          <p className="mt-1 text-sm text-mute">
            Mark something “I&apos;ve been there” and rate it — your personal
            top list starts with the first one.
          </p>
          <Link
            href="/your-denver"
            className="mt-4 inline-block rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90"
          >
            Rate your history
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/rankings?category=${c.slug}`}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  c.category === active.category
                    ? "bg-ink text-white"
                    : "bg-mute-hush text-ink hover:bg-mute-divider"
                }`}
              >
                {c.label}
                <span className="ml-1.5 text-xs opacity-60">{c.total}</span>
              </Link>
            ))}
          </div>

          <section className="rounded-card border border-mute-divider bg-surface">
            <div className="flex items-center justify-between border-b border-mute-divider px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">
                Your {active.label} · {active.total} ranked
              </h2>
              {user?.username ? (
                <CopyLinkButton
                  url={`/u/${user.username}/rankings/${active.slug}`}
                  title={`My top ${active.label} in Denver · Pulse`}
                  disabled={!user.rankingsArePublic}
                  disabledHint="Your rankings are set to private"
                />
              ) : (
                <span
                  className="text-xs text-mute"
                  title="Set a username in Settings → Profile to share"
                >
                  Set a username to share
                </span>
              )}
            </div>
            <ul className="px-4">
              {active.entries.map((entry) => (
                <RankedListRow key={entry.entryId} entry={entry} canEdit />
              ))}
            </ul>
          </section>

          <p className="text-center text-xs text-mute">
            Scores settle as you rank more — every new duel sharpens the list.
          </p>
        </>
      )}
    </div>
  );
}
