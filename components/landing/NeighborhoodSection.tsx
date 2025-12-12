import Link from "next/link";

// Denver neighborhood info
const NEIGHBORHOOD_INFO: Record<string, { vibe: string; icon: string }> = {
  "RiNo": { vibe: "Arts & Breweries", icon: "🎨" },
  "LoDo": { vibe: "Downtown & Nightlife", icon: "🌃" },
  "Capitol Hill": { vibe: "Diverse & Eclectic", icon: "🏳️‍🌈" },
  "Highlands": { vibe: "Trendy & Local", icon: "🍽️" },
  "LoHi": { vibe: "Hip & Upscale", icon: "✨" },
  "Five Points": { vibe: "Jazz & Culture", icon: "🎺" },
  "Cherry Creek": { vibe: "Shopping & Dining", icon: "🛍️" },
  "Wash Park": { vibe: "Active & Green", icon: "🏃" },
  "Baker": { vibe: "Vintage & Cafes", icon: "☕" },
  "Sloan's Lake": { vibe: "Lakeside Living", icon: "🏖️" },
  "Park Hill": { vibe: "Family & Community", icon: "🏡" },
  "Colfax": { vibe: "Eclectic & Iconic", icon: "🎭" },
};

interface NeighborhoodSectionProps {
  neighborhoodCounts: Record<string, number>;
}

export default function NeighborhoodSection({ neighborhoodCounts }: NeighborhoodSectionProps) {
  // Get neighborhoods with counts, sorted by count
  const neighborhoods = Object.entries(neighborhoodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  if (neighborhoods.length === 0) {
    return null;
  }

  return (
    <section className="landing-section bg-slate-100">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="landing-heading text-slate-900 mb-3">Explore Denver Neighborhoods</h2>
          <p className="landing-subheading max-w-2xl mx-auto">
            Each neighborhood has its own unique vibe
          </p>
        </div>

        {/* Neighborhoods Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {neighborhoods.map(([neighborhood, count]) => {
            const info = NEIGHBORHOOD_INFO[neighborhood] || { vibe: "Local Gems", icon: "📍" };
            return (
              <Link
                key={neighborhood}
                href={`/feed?neighborhoods=${encodeURIComponent(neighborhood)}`}
                className="group block bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition"
              >
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{info.icon}</span>
                  <h3 className="font-semibold text-slate-900 group-hover:text-primary transition">
                    {neighborhood}
                  </h3>
                </div>

                {/* Vibe */}
                <p className="text-sm text-slate-500 mb-2">{info.vibe}</p>

                {/* Count */}
                <p className="text-xs text-primary font-medium">
                  {count} upcoming {count === 1 ? "event" : "events"}
                </p>
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
            Explore all neighborhoods
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
