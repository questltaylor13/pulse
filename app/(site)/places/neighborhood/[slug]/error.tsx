"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NeighborhoodError({ error }: { error: Error }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[neighborhood-detail] error:", error);
    router.replace("/?tab=places&notice=neighborhood-unavailable");
  }, [error, router]);

  return null;
}
