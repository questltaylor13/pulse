"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HomeIcon, ProfileIcon, SavedIcon } from "@/components/icons";

type NavItem = {
  label: string;
  href: string;
  icon: typeof HomeIcon;
  matchPrefix?: string;
};

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const items: NavItem[] = [
    { label: "Home", href: "/", icon: HomeIcon },
    { label: "Saved", href: "/lists", icon: SavedIcon, matchPrefix: "/lists" },
    {
      label: "Profile",
      // /profile doesn't exist; username-based public profile when we have
      // one, otherwise the settings page (which also carries the sign-out).
      href: session?.user?.username
        ? `/u/${session.user.username}`
        : session
          ? "/settings/profile"
          : "/auth/login",
      icon: ProfileIcon,
      matchPrefix: session ? "/settings" : "/auth",
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-bottomNav border-t border-mute-divider bg-surface pb-safe md:hidden"
    >
      <ul className="flex h-[60px] items-stretch">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.matchPrefix && pathname?.startsWith(item.matchPrefix);
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={`flex h-full flex-col items-center justify-center gap-1 ${
                  isActive ? "text-coral" : "text-mute-soft hover:text-ink"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
