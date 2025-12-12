import Link from "next/link";
import { Category } from "@prisma/client";

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  FOOD: { emoji: "🍽️", label: "Food", color: "from-orange-400 to-orange-500" },
  LIVE_MUSIC: { emoji: "🎵", label: "Live Music", color: "from-pink-400 to-pink-500" },
  ART: { emoji: "🎨", label: "Art", color: "from-purple-400 to-purple-500" },
  BARS: { emoji: "🍸", label: "Bars", color: "from-amber-400 to-amber-500" },
  COFFEE: { emoji: "☕", label: "Coffee", color: "from-yellow-500 to-amber-500" },
  OUTDOORS: { emoji: "🏔️", label: "Outdoors", color: "from-green-400 to-green-500" },
  FITNESS: { emoji: "💪", label: "Fitness", color: "from-blue-400 to-blue-500" },
  POPUP: { emoji: "🎪", label: "Pop-ups", color: "from-indigo-400 to-indigo-500" },
  SEASONAL: { emoji: "🎄", label: "Seasonal", color: "from-red-400 to-red-500" },
  RESTAURANT: { emoji: "🍴", label: "Restaurants", color: "from-orange-400 to-orange-500" },
  ACTIVITY_VENUE: { emoji: "🎯", label: "Activities", color: "from-cyan-400 to-cyan-500" },
  OTHER: { emoji: "✨", label: "Other", color: "from-slate-400 to-slate-500" },
};

interface CategoryGridSectionProps {
  categoryCounts: Record<string, number>;
}

export default function CategoryGridSection({ categoryCounts }: CategoryGridSectionProps) {
  // Get categories with counts, sorted by count
  const categoriesWithCounts = Object.entries(categoryCounts)
    .filter(([cat]) => CATEGORY_CONFIG[cat])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  if (categoriesWithCounts.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-white">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="landing-heading text-slate-900 mb-3">Explore by Category</h2>
          <p className="landing-subheading max-w-2xl mx-auto">
            Find exactly what you&apos;re looking for
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {categoriesWithCounts.map(([category, count]) => {
            const config = CATEGORY_CONFIG[category];
            return (
              <Link
                key={category}
                href={`/feed?category=${category}`}
                className="group block"
              >
                <div className="relative rounded-xl bg-slate-50 border border-slate-200 p-6 text-center transition hover:shadow-md hover:border-slate-300 overflow-hidden">
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                  {/* Emoji */}
                  <div className="text-4xl mb-3">{config.emoji}</div>

                  {/* Label */}
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary transition">
                    {config.label}
                  </h3>

                  {/* Count */}
                  <p className="text-sm text-slate-500">
                    {count} {count === 1 ? "event" : "events"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View all link */}
        <div className="mt-8 text-center">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Browse all categories
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
