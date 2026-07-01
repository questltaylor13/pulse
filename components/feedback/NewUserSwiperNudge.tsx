"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Wave 2 — auto-open the taste swiper ONCE for a brand-new signed-in user
// (onboarding done, zero feedback) so cold-start personalization has signal to
// work with. localStorage-gated so it never nags, and skipped if the swiper is
// already open or the user has since given feedback (server passes `eligible`).

const SEEN_KEY = "pulse_swiper_autoopened";

export default function NewUserSwiperNudge({ eligible }: { eligible: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!eligible) return;
    if (searchParams?.get("swiper") === "1") return; // already open
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      return; // storage blocked → don't nag
    }
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("swiper", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, [eligible, router, pathname, searchParams]);

  return null;
}
