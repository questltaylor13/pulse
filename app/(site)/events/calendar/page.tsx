import Link from "next/link";
import DiscoveryCalendar from "@/components/home/DiscoveryCalendar";
import { denverDateKey } from "@/lib/time/denver";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event calendar | Pulse",
  description: "Browse what's happening in Denver by day.",
};

// Wave 2 — month calendar discovery surface. A tappable density calendar that
// deep-links each day into the date-filtered feed.
export default function EventCalendarPage() {
  const todayKey = denverDateKey(new Date());

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-display font-serif text-ink">Calendar</h1>
          <p className="mt-1 text-body text-mute">What&apos;s on in Denver, by day.</p>
        </div>
        <Link
          href="/"
          className="text-[13px] font-medium text-coral hover:text-coral-dark"
        >
          ← Feed
        </Link>
      </div>
      <DiscoveryCalendar todayKey={todayKey} />
    </div>
  );
}
