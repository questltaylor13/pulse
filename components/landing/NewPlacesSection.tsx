import Link from "next/link";
import { Category, OpeningStatus } from "@prisma/client";
import { CATEGORY_LABELS } from "@/lib/constants/categories";

interface NewPlace {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  category: Category | null;
  openedDate: string | null;
  isNew: boolean | null;
  isFeatured: boolean | null;
  googleRating: number | null;
  priceLevel: number | null;
  primaryImageUrl: string | null;
  pulseDescription: string | null;
  vibeTags: string[];
  daysOld: number | null;
}

interface UpcomingPlace {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
  category: Category | null;
  openingStatus: OpeningStatus;
  expectedOpenDate: string | null;
  isFeatured: boolean | null;
  primaryImageUrl: string | null;
  pulseDescription: string | null;
  conceptDescription: string | null;
}

interface NewPlacesSectionProps {
  newPlaces: NewPlace[];
  upcomingPlaces: UpcomingPlace[];
}

export default function NewPlacesSection({ newPlaces, upcomingPlaces }: NewPlacesSectionProps) {
  const allPlaces = [
    ...upcomingPlaces.map((p) => ({ ...p, type: "upcoming" as const })),
    ...newPlaces.map((p) => ({ ...p, type: "new" as const })),
  ].slice(0, 6);

  if (allPlaces.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-white">
      <div className="container">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="landing-heading text-slate-900 mb-2">New in Denver</h2>
            <p className="landing-subheading">Recently opened + coming soon</p>
          </div>
          <Link
            href="/places"
            className="hidden sm:inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Browse all places
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Places Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPlaces.map((place) => {
            const isUpcoming = place.type === "upcoming";
            const upcomingPlace = isUpcoming ? (place as UpcomingPlace & { type: "upcoming" }) : null;
            const newPlace = !isUpcoming ? (place as NewPlace & { type: "new" }) : null;

            return (
              <Link
                key={place.id}
                href={`/places/${place.id}`}
                className="group block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition hover:shadow-md hover:border-primary/30"
              >
                {/* Image placeholder */}
                <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200">
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {isUpcoming ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        upcomingPlace?.openingStatus === "SOFT_OPEN"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {upcomingPlace?.openingStatus === "SOFT_OPEN" ? "Soft Open" : "Coming Soon"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {newPlace?.daysOld ? `${newPlace.daysOld} days old` : "New"}
                      </span>
                    )}
                  </div>

                  {/* Featured badge */}
                  {place.isFeatured && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-xs font-medium text-white">
                        Featured
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Category */}
                  {place.category && (
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {CATEGORY_LABELS[place.category] || place.category}
                    </span>
                  )}

                  {/* Name */}
                  <h3 className="font-semibold text-slate-900 mt-1 mb-2 group-hover:text-primary transition">
                    {place.name}
                  </h3>

                  {/* Description */}
                  {(place.pulseDescription || (isUpcoming && upcomingPlace?.conceptDescription)) && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {place.pulseDescription || upcomingPlace?.conceptDescription}
                    </p>
                  )}

                  {/* Location & Rating */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {place.neighborhood || "Denver"}
                    </span>
                    {!isUpcoming && newPlace?.googleRating && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {newPlace.googleRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/places"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Browse all places
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
