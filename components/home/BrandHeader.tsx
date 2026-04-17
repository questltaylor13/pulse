"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AvatarPlaceholderIcon } from "@/components/icons";

export default function BrandHeader() {
  const { data: session } = useSession();
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? null;
  const avatarHref = session ? "/profile" : "/auth/login";

  return (
    <div className="flex h-12 items-center justify-between bg-surface px-5">
      <Link href="/" className="text-[22px] font-medium text-coral">
        Pulse
      </Link>
      <Link
        href={avatarHref}
        aria-label={session ? "Profile" : "Sign in"}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-mute-divider"
      >
        {initial ? (
          <span className="text-sm font-medium text-ink">{initial}</span>
        ) : (
          <AvatarPlaceholderIcon size={32} />
        )}
      </Link>
    </div>
  );
}
