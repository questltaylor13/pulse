import Link from "next/link";

const highlights = [
  "Personalized recommendations tailored to your vibe",
  "Simple onboarding for city, status, and interests",
  "Admin-friendly event management for Denver",
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">MVP setup</p>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Welcome to Pulse</h1>
            <p className="max-w-2xl text-lg text-slate-700">
              A streamlined starting point for Denver event discovery. We are laying the foundations for
              onboarding, personalized feeds, and future recommendations.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700">
              {highlights.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/feed" className="btn-primary">
                View feed preview
              </Link>
              <Link
                href="https://github.com/"
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-primary underline"
              >
                Project docs
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-sm text-slate-700">
            <p className="mb-2 font-semibold text-primary">Next steps</p>
            <ul className="list-disc space-y-2 pl-4">
              <li>Hook up authentication with NextAuth</li>
              <li>Finish onboarding steps for preferences</li>
              <li>Build event feeds and admin tools</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
