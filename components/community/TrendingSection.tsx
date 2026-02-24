"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { CATEGORY_COLORS, CATEGORY_EMOJI } from "@/lib/constants/categories";

interface TrendingEvent {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  neighborhood: string | null;
  startTime: Date | string;
  imageUrl: string | null;
  saveCount: number;
}

interface HotPlace {
  id: string;
  title: string;
  category: Category;
  neighborhood: string | null;
  imageUrl: string | null;
  isNew: boolean;
  isUpcoming: boolean;
  isSoftOpen: boolean;
}

interface TrendingSectionProps {
  events: TrendingEvent[];
  places: HotPlace[];
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function TrendingSection({
  events,
  places,
}: TrendingSectionProps) {
  return (
    <div className="space-y-6">
      {/* Trending Events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="text-orange-500">🔥</span>
            Trending This Week
          </h3>
          <Link
            href="/feed"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            See All
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 5).map((event, index) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition group"
              >
                {/* Rank number */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>

                {/* Event image or emoji */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                  {event.imageUrl ? (
                    event.imageUrl.startsWith("http") ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">
                      {CATEGORY_EMOJI[event.category]}
                    </div>
                  )}
                </div>

                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm line-clamp-1 group-hover:text-primary transition">
                    {event.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {event.venueName}
                    {event.neighborhood && ` · ${event.neighborhood}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {formatDate(event.startTime)}
                    </span>
                    {event.saveCount > 0 && (
                      <span className="text-xs text-orange-600 font-medium flex items-center gap-0.5">
                        🔥 {event.saveCount} going
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No trending events this week
          </p>
        )}
      </div>

      {/* Hot Places */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>📍</span>
            Hot Places
          </h3>
          <Link
            href="/places"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            See All
          </Link>
        </div>

        {places.length > 0 ? (
          <div className="space-y-3">
            {places.slice(0, 4).map((place) => (
              <Link
                key={place.id}
                href={`/places/${place.id}`}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 transition group"
              >
                {/* Place image or emoji */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                  {place.imageUrl ? (
                    place.imageUrl.startsWith("http") ? (
                      <img
                        src={place.imageUrl}
                        alt={place.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={place.imageUrl}
                        alt={place.title}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">
                      {CATEGORY_EMOJI[place.category]}
                    </div>
                  )}
                </div>

                {/* Place info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-900 text-sm line-clamp-1 group-hover:text-primary transition">
                      {place.title}
                    </h4>
                    {place.isNew && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">
                        NEW
                      </span>
                    )}
                    {place.isUpcoming && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                        SOON
                      </span>
                    )}
                    {place.isSoftOpen && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                        SOFT OPEN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {place.neighborhood || "Denver"}
                  </p>
                  <span className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[place.category]}`}>
                    {place.category.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">
            No hot places right now
          </p>
        )}
      </div>
    </div>
  );
}
