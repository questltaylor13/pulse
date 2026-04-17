"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EventDetailError({ error }: { error: Error }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[event-detail] runtime error:", error);
    router.replace("/?notice=event-unavailable");
  }, [error, router]);
  return null;
}
