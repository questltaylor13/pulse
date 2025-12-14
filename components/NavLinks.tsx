"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function NavLinks() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;

  const linkClass = (href: string) => {
    const isActive = pathname === href || pathname?.startsWith(href + "/");
    return `px-3 py-2 text-sm font-medium rounded-lg transition ${
      isActive
        ? "text-primary bg-primary/5"
        : "text-slate-600 hover:text-primary hover:bg-slate-50"
    }`;
  };

  return (
    <nav className="hidden md:flex items-center gap-1">
      <Link href="/feed" className={linkClass("/feed")}>
        Feed
      </Link>
      <Link href="/places" className={linkClass("/places")}>
        Places
      </Link>
      <Link href="/lists" className={linkClass("/lists")}>
        Lists
      </Link>
      {session?.user ? (
        <Link
          href="/community"
          className={`${linkClass("/community")} ${
            pathname?.startsWith("/friends") ? "text-primary bg-primary/5" : ""
          }`}
        >
          Community
        </Link>
      ) : (
        <Link href="/community" className={linkClass("/community")}>
          Community
        </Link>
      )}
      {isAdmin && (
        <Link
          href="/labs"
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition ${
            pathname?.startsWith("/labs")
              ? "text-purple-700 bg-purple-50"
              : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          Labs
          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
            Beta
          </span>
        </Link>
      )}
    </nav>
  );
}
