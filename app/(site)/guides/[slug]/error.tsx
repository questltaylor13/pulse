"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuideError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[guide-detail] error:", error);
    router.replace("/?tab=guides&notice=guide-unavailable");
  }, [error, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-body text-mute">Redirecting...</p>
    </div>
  );
}
