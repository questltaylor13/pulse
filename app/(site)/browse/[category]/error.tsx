"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BrowseError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Browse error:", error);
    router.replace("/?notice=browse-unavailable");
  }, [error, router]);

  return null;
}
