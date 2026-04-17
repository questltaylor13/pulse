"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlaceDetailError({ error }: { error: Error }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[place-detail] runtime error:", error);
    router.replace("/?notice=place-unavailable");
  }, [error, router]);
  return null;
}
