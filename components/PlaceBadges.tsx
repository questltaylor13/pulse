"use client";

import { OpeningStatus } from "@prisma/client";

interface NewBadgeProps {
  daysOld: number;
  size?: "sm" | "md";
}

export function NewBadge({ daysOld, size = "md" }: NewBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  let label = "New!";
  if (daysOld <= 7) {
    label = "Just Opened!";
  } else if (daysOld <= 14) {
    label = `New! ${Math.ceil(daysOld / 7)} weeks ago`;
  } else if (daysOld <= 30) {
    label = `Opened ${Math.floor(daysOld / 7)} weeks ago`;
  } else if (daysOld <= 60) {
    label = `Opened ${Math.floor(daysOld / 30)} month${daysOld > 45 ? "s" : ""} ago`;
  } else {
    label = "New!";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white ${sizeClasses} animate-pulse`}
      style={{ animationDuration: "3s" }}
    >
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {label}
    </span>
  );
}

interface ComingSoonBadgeProps {
  daysUntil?: number;
  expectedDate?: Date | string;
  size?: "sm" | "md";
}

export function ComingSoonBadge({ daysUntil, expectedDate, size = "md" }: ComingSoonBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  let label = "Coming Soon";

  if (daysUntil !== undefined) {
    if (daysUntil <= 0) {
      label = "Opening Any Day!";
    } else if (daysUntil === 1) {
      label = "Opens Tomorrow!";
    } else if (daysUntil <= 7) {
      label = `Opens This Week`;
    } else if (daysUntil <= 14) {
      label = `Opening in ${daysUntil} days`;
    } else if (daysUntil <= 30) {
      label = `Opens in ${Math.ceil(daysUntil / 7)} weeks`;
    } else {
      label = "Coming Soon";
    }
  } else if (expectedDate) {
    const date = new Date(expectedDate);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    label = `Opening ${month}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white ${sizeClasses}`}
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </span>
  );
}

interface SoftOpenBadgeProps {
  size?: "sm" | "md";
}

export function SoftOpenBadge({ size = "md" }: SoftOpenBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-orange-400 to-yellow-400 text-white ${sizeClasses}`}
    >
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
      </svg>
      Soft Open - Try First!
    </span>
  );
}

interface JustAnnouncedBadgeProps {
  size?: "sm" | "md";
}

export function JustAnnouncedBadge({ size = "md" }: JustAnnouncedBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium bg-slate-700 text-white ${sizeClasses}`}
    >
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
      </svg>
      Just Announced
    </span>
  );
}

interface HypeBadgeProps {
  count: number;
  size?: "sm" | "md";
}

export function HypeBadge({ count, size = "md" }: HypeBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  if (count < 5) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white ${sizeClasses}`}
    >
      <span className="animate-pulse">🔥</span>
      {count} waiting
    </span>
  );
}

interface FeaturedBadgeProps {
  size?: "sm" | "md";
}

export function FeaturedBadge({ size = "md" }: FeaturedBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 ${sizeClasses}`}
    >
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Editor's Pick
    </span>
  );
}

// Utility function to get the appropriate badge for a place
interface PlaceBadgeData {
  openingStatus: OpeningStatus;
  openedDate?: Date | string | null;
  expectedOpenDate?: Date | string | null;
  announcedDate?: Date | string | null;
  isNew?: boolean;
  isUpcoming?: boolean;
  isFeatured?: boolean;
  preOpeningSaves?: number;
}

export function getPlaceBadges(place: PlaceBadgeData, size: "sm" | "md" = "md") {
  const badges: React.ReactNode[] = [];
  const now = new Date();

  // Featured badge always shows first
  if (place.isFeatured) {
    badges.push(<FeaturedBadge key="featured" size={size} />);
  }

  // Status-based badges
  if (place.openingStatus === "SOFT_OPEN") {
    badges.push(<SoftOpenBadge key="soft" size={size} />);
  } else if (place.openingStatus === "COMING_SOON" || place.isUpcoming) {
    if (place.expectedOpenDate) {
      const expected = new Date(place.expectedOpenDate);
      const daysUntil = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      badges.push(<ComingSoonBadge key="coming" daysUntil={daysUntil} size={size} />);
    } else {
      badges.push(<ComingSoonBadge key="coming" size={size} />);
    }

    // Show "Just Announced" if announced within last 14 days
    if (place.announcedDate) {
      const announced = new Date(place.announcedDate);
      const daysSinceAnnounced = Math.ceil((now.getTime() - announced.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceAnnounced <= 14) {
        badges.push(<JustAnnouncedBadge key="announced" size={size} />);
      }
    }
  } else if (place.openingStatus === "OPEN" && (place.isNew || place.openedDate)) {
    const openedDate = place.openedDate ? new Date(place.openedDate) : null;
    if (openedDate) {
      const daysOld = Math.ceil((now.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld <= 90) {
        badges.push(<NewBadge key="new" daysOld={daysOld} size={size} />);
      }
    } else if (place.isNew) {
      badges.push(<NewBadge key="new" daysOld={30} size={size} />);
    }
  }

  // Hype badge for upcoming places
  if ((place.isUpcoming || place.openingStatus === "COMING_SOON") && place.preOpeningSaves && place.preOpeningSaves >= 5) {
    badges.push(<HypeBadge key="hype" count={place.preOpeningSaves} size={size} />);
  }

  return badges;
}
