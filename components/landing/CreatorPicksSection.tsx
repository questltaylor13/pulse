import Link from "next/link";
import Image from "next/image";
import { Category, ItemType } from "@prisma/client";

const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-100 text-purple-700",
  LIVE_MUSIC: "bg-pink-100 text-pink-700",
  BARS: "bg-amber-100 text-amber-700",
  FOOD: "bg-orange-100 text-orange-700",
  COFFEE: "bg-yellow-100 text-yellow-700",
  OUTDOORS: "bg-green-100 text-green-700",
  FITNESS: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-red-100 text-red-700",
  POPUP: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  ACTIVITY_VENUE: "bg-cyan-100 text-cyan-700",
};

interface TopPick {
  id: string;
  title: string;
  type: ItemType;
  category: Category;
  venueName: string;
  reason: string | null;
}

interface Creator {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  profileImageUrl: string | null;
  profileColor: string | null;
  isFounder: boolean;
  followerCount: number;
  topPick: TopPick | null;
}

interface CreatorPicksSectionProps {
  creators: Creator[];
}

export default function CreatorPicksSection({ creators }: CreatorPicksSectionProps) {
  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-white">
      <div className="container">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="landing-heading text-slate-900 mb-2">Creator Picks</h2>
            <p className="landing-subheading">Curated recommendations from local tastemakers</p>
          </div>
          <Link
            href="/influencers"
            className="hidden sm:inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Meet all creators
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
            >
              {/* Creator Header */}
              <div
                className="p-6 pb-4"
                style={{ backgroundColor: creator.profileColor || "#F5EDE6" }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0">
                    {creator.profileImageUrl ? (
                      <Image
                        src={creator.profileImageUrl}
                        alt={creator.displayName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-500">
                        {creator.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{creator.displayName}</h3>
                      {creator.isFounder && (
                        <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-primary">
                          Founder
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">@{creator.handle}</p>
                  </div>
                </div>
              </div>

              {/* Top Pick */}
              {creator.topPick ? (
                <Link
                  href={creator.topPick.type === "EVENT" ? `/events/${creator.topPick.id}` : `/places/${creator.topPick.id}`}
                  className="block p-6 pt-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Top Pick</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[creator.topPick.category]}`}>
                      {creator.topPick.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1">{creator.topPick.title}</h4>
                  <p className="text-sm text-slate-500 mb-2">{creator.topPick.venueName}</p>
                  {creator.topPick.reason && (
                    <p className="text-sm text-slate-600 italic line-clamp-2">
                      &ldquo;{creator.topPick.reason}&rdquo;
                    </p>
                  )}
                </Link>
              ) : (
                <div className="p-6 pt-4">
                  <p className="text-sm text-slate-500 line-clamp-3">{creator.bio}</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 pb-4">
                <Link
                  href={`/influencers/${creator.handle}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View all picks
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/influencers"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Meet all creators
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
