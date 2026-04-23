"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// PRD 5 Phase 2 §2.1 — "Finish your profile" nudge in the home feed.
// Strip renders between the scope toggle and the Today section. Server
// component decides whether to render (based on completion + dismissal
// timestamp); this client component owns the dismissal interaction and
// the Continue → launch-swiper click.

interface Props {
  completion: number; // 0–100
}

export default function ProfileCompletionStrip({ completion }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  // Deep-link into the swiper via URL param so back-button closes it.
  const launchHref = (() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("swiper", "1");
    return `${pathname}?${sp.toString()}`;
  })();

  const handleDismiss = async () => {
    setHidden(true); // Optimistic — strip disappears immediately
    try {
      await fetch("/api/feedback/dismiss-strip", { method: "POST" });
    } catch {
      // Silent — next SSR will re-evaluate timestamp and re-show the strip
      // if the dismiss didn't persist server-side. No user-facing error.
    }
    router.refresh();
  };

  const pct = Math.max(0, Math.min(100, Math.round(completion)));

  return (
    <div className="px-5 pt-3">
      <div className="relative flex items-center gap-3 rounded-card border border-mute-divider bg-surface p-3 shadow-sm">
        <ProgressRing percent={pct} size={42} stroke={4} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-ink">Finish your profile</p>
          <p className="truncate text-[12px] text-mute">
            2 min of taste-training. Your feed gets smarter fast.
          </p>
        </div>
        <Link
          href={launchHref}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-surface hover:bg-ink/90"
        >
          Continue
        </Link>
        <button
          type="button"
          aria-label="Dismiss for now"
          onClick={handleDismiss}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-mute hover:bg-mute-hush hover:text-ink"
        >
          <span aria-hidden="true" className="text-sm leading-none">✕</span>
        </button>
      </div>
    </div>
  );
}

function ProgressRing({
  percent,
  size,
  stroke,
}: {
  percent: number;
  size: number;
  stroke: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-mute-hush"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-coral transition-[stroke-dashoffset] duration-300"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums text-ink">
        {percent}%
      </span>
    </div>
  );
}
