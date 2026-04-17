import type { ReactNode } from "react";

function BadgePill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "dark" | "teal" }) {
  const base =
    "absolute left-2 top-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-meta font-medium";
  const tones: Record<string, string> = {
    default: "bg-surface/90 text-ink",
    dark: "bg-ink/90 text-surface",
    teal: "bg-teal-soft text-teal",
  };
  return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}

export function TodayBadge() {
  return <BadgePill tone="dark">Tonight</BadgePill>;
}

export function EditorPickBadge() {
  return <BadgePill>★ Editor's pick</BadgePill>;
}

export function TrendingBadge() {
  return <BadgePill>Trending</BadgePill>;
}

export function FreeBadge() {
  return <BadgePill tone="teal">Free</BadgePill>;
}

export function JustOpenedBadge() {
  return (
    <BadgePill tone="teal">
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      Just opened
    </BadgePill>
  );
}
