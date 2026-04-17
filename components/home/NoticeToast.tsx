"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  "event-unavailable": "This event is no longer available.",
  "place-unavailable": "This place is no longer available.",
  "neighborhood-unavailable": "This neighborhood page is no longer available.",
  "guide-unavailable": "This guide is no longer available.",
  "browse-unavailable": "This browse page is no longer available.",
};

export default function NoticeToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = searchParams?.get("notice");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notice && MESSAGES[notice]) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.delete("notice");
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : "/", { scroll: false });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notice, router, searchParams]);

  if (!notice || !visible || !MESSAGES[notice]) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-modal flex justify-center md:inset-x-0 md:bottom-6"
    >
      <div className="pointer-events-auto max-w-sm rounded-card bg-ink px-4 py-3 text-[13px] text-surface shadow-md">
        {MESSAGES[notice]}
      </div>
    </div>
  );
}
