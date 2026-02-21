import Link from "next/link";

export default function CoFounderCTASection() {
  return (
    <section className="landing-section bg-slate-50">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-8 md:p-12 overflow-hidden">
            {/* Subtle accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-display mb-4">
                Build This With <span className="text-primary">Me</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                I&apos;m looking for a co-founder to take Pulse from product to community.
                The tech is built — now it needs a voice.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* What's Built */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm">✓</span>
                  What&apos;s Already Built
                </h3>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    Full-stack Next.js app with AI-powered event curation
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    Personalized feed with 8-step onboarding
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    Curator dashboard, badges, groups, and community features
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    Event scraping pipeline and data infrastructure
                  </li>
                </ul>
              </div>

              {/* What You'd Own */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">→</span>
                  What You&apos;d Own
                </h3>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Marketing, social media, and growth strategy
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Local partnerships and venue relationships
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Content creation and community building
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Revenue-sharing co-founder partnership
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-slate-500 mb-4">
                Ideal: Denver-based, social media savvy, passionate about the local scene
              </p>
              <a
                href="mailto:questltaylor13@gmail.com"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white shadow-md hover:bg-primary-dark hover:shadow-lg transition"
              >
                Let&apos;s Talk
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
