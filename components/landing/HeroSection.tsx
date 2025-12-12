import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-primary/5 to-slate-50">
      <div className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Denver&apos;s Local Discovery Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
            Discover Denver&apos;s Best{" "}
            <span className="text-primary">Events</span> &{" "}
            <span className="text-primary-dark">Places</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Personalized recommendations based on your vibe. Find hidden gems,
            trending spots, and curated picks from local tastemakers.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary px-6 py-3 text-base">
              Get Started Free
            </Link>
            <Link
              href="/feed"
              className="inline-flex items-center justify-center rounded-md border-2 border-primary px-6 py-3 text-base font-semibold text-primary transition hover:bg-primary/5"
            >
              Browse Events
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Curated by locals</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Denver focused</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>100% free</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
