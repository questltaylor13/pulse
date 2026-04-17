import Link from "next/link";

export const metadata = {
  title: "Premium",
};

const FREE_FEATURES = [
  "Browse events and activities",
  "Personalized recommendations",
  "Save and bookmark events",
  "Basic search and filters",
  "Category-based discovery",
];

const PREMIUM_FEATURES = [
  "Creator-curated lists from Denver locals",
  "Shared lists with friends & partner (couple's mode)",
  "Member-only deals at featured venues (rotating monthly)",
  "Priority access to sold-out events",
  "Year-end Wrapped-style recap of your Denver adventures",
  "Ad-free experience",
];

const VENUE_FEATURES = [
  '"Opening Soon" alerts to Pulse members',
  "Featured placement for new locations",
  "Member-deal partnerships (e.g., 15% off first visit)",
  "Analytics dashboard on engagement",
];

export default function PremiumPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Coming Soon
          </p>
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-6">
            Pulse Premium
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            Unlock the full Denver experience. Curated lists, exclusive deals,
            shared planning with friends, and more.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Free</h2>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              $0<span className="text-base font-normal text-slate-500">/mo</span>
            </p>
            <p className="text-slate-500 mb-8">Everything you need to explore Denver</p>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              className="mt-8 block w-full text-center rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Premium Tier */}
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Coming Soon
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Premium</h2>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              $9<span className="text-base font-normal text-slate-500">/mo</span>
            </p>
            <p className="text-slate-500 mb-8">The complete Denver discovery experience</p>
            <ul className="space-y-3">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-8 block w-full text-center rounded-xl bg-primary/40 px-6 py-3 font-semibold text-white cursor-not-allowed"
            >
              Notify Me When Available
            </button>
          </div>
        </div>

        {/* For Venues Section */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-primary/5 border border-slate-200 p-10">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              For Venues & Partners
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Put your venue in front of Denver&apos;s most engaged audience
            </h2>
            <p className="text-slate-600 mb-8">
              Pulse members are actively looking for things to do. Partner with us to
              reach people who are ready to show up.
            </p>
            <ul className="space-y-3 mb-8">
              {VENUE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@pulse.app"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition"
            >
              Get in Touch
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Vision Statement */}
        <div className="text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            The future of local discovery
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Pulse is building the platform that makes every Denver weekend better.
            From AI-powered recommendations to community-curated lists, we&apos;re
            connecting people with the experiences they didn&apos;t know they were
            looking for.
          </p>
        </div>
      </div>
    </div>
  );
}
