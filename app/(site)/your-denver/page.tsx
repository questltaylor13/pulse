import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/constants/categories";
import { fetchDoneItems, type DoneItem } from "@/lib/feedback/your-denver";
import YourDenverFilters from "./YourDenverFilters";

// PRD 5 §4 — Your Denver history view.
// Lives here as a standalone top-level route until usage data supports the
// promotion to the main nav (§4.1 gates promotion on 10+ entries).

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ kind?: string }>;
}

const KIND_LABELS: Record<string, string> = {
  event: "event",
  place: "place",
  discovery: "hidden gem",
};

function hrefForItem(item: DoneItem): string | null {
  if (!item.sourceId) return null;
  if (item.kind === "event") return `/events/${item.sourceId}`;
  if (item.kind === "place") return `/places/${item.sourceId}`;
  if (item.kind === "discovery") return `/discoveries/${item.sourceId}`;
  return null;
}

function formatDoneAt(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export default async function YourDenverPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?next=/your-denver");

  const params = await searchParams;
  const kindFilter = params.kind ?? "all";

  const allDone = await fetchDoneItems(session.user.id);
  const counts = {
    all: allDone.length,
    event: allDone.filter((i) => i.kind === "event").length,
    place: allDone.filter((i) => i.kind === "place").length,
    discovery: allDone.filter((i) => i.kind === "discovery").length,
  };
  const visible =
    kindFilter === "all"
      ? allDone
      : allDone.filter((i) => i.kind === kindFilter);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
            🎯 Your Denver
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Your Denver
        </h1>
        <p className="text-slate-600">
          {counts.all === 0
            ? "Mark things you've been to — we'll keep track here."
            : `${counts.place} places · ${counts.event} events · ${counts.discovery} hidden gems`}
        </p>
      </header>

      {counts.all === 0 ? (
        <EmptyState />
      ) : (
        <>
          <YourDenverFilters counts={counts} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <DoneCard key={item.statusId} item={item} />
            ))}
          </div>
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
              No {KIND_LABELS[kindFilter] ?? "entries"} yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DoneCard({ item }: { item: DoneItem }) {
  const href = hrefForItem(item);
  const locationLine = [item.neighborhood, item.town].filter(Boolean).join(" · ");
  const body = (
    <article className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-purple-300 hover:shadow-md">
      <div className="relative h-32 bg-slate-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : item.category ? (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            {CATEGORY_EMOJI[item.category] ?? "📍"}
          </div>
        ) : (
          <div className="h-full w-full" />
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-purple-600/95 px-2 py-0.5 text-[10px] font-bold text-white">
          🎯 Been there
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5">
        {item.category && (
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[item.category] ?? "bg-slate-100 text-slate-700"}`}
          >
            {CATEGORY_EMOJI[item.category]} {CATEGORY_LABELS[item.category]}
          </span>
        )}
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
          {item.title}
        </h3>
        {locationLine && (
          <p className="truncate text-xs text-slate-500">{locationLine}</p>
        )}
        <p className="mt-auto text-[11px] text-slate-400">
          Been since {formatDoneAt(item.doneAt)}
        </p>
      </div>
    </article>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-base font-semibold text-slate-900">
        Your Denver starts here
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Mark things you've already been to — we'll keep track so your feed
        stays fresh.
      </p>
      <Link
        href="/?swiper=1"
        className="mt-4 inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Start adding
      </Link>
    </div>
  );
}
