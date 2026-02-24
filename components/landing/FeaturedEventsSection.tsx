import Link from "next/link";
import { Category } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants/categories";

interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  category: Category;
  venueName: string;
  neighborhood: string | null;
  startTime: string;
  priceRange: string;
  dayOfWeek: string;
  formattedDate: string;
  formattedTime: string;
}

interface FeaturedEventsSectionProps {
  events: FeaturedEvent[];
}

export default function FeaturedEventsSection({ events }: FeaturedEventsSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-white">
      <div className="container">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="landing-heading text-slate-900 mb-2">This Week in Denver</h2>
            <p className="landing-subheading">Handpicked events happening soon</p>
          </div>
          <Link
            href="/feed"
            className="hidden sm:inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            See all events
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.slice(0, 6).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
            >
              {/* Category & Date */}
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}>
                  {CATEGORY_LABELS[event.category]}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {event.dayOfWeek}, {event.formattedDate}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition">
                {event.title}
              </h3>

              {/* Venue & Time */}
              <div className="space-y-1 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="truncate">{event.venueName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{event.formattedTime}</span>
                  {event.neighborhood && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span>{event.neighborhood}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{event.priceRange}</span>
                <span className="text-xs text-primary font-medium group-hover:underline">
                  View details
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            See all events
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
