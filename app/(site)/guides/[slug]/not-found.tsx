"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuideNotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?tab=guides&notice=guide-unavailable");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-body text-mute">Redirecting...</p>
    </div>
  );
}
