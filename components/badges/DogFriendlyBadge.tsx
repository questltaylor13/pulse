"use client";

import { useState } from "react";

interface DogFriendlyBadgeProps {
  details?: string | null;
  size?: "sm" | "md";
}

export function DogFriendlyBadge({ details, size = "md" }: DogFriendlyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-[10px]"
    : "px-2 py-0.5 text-xs";

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded-full font-medium ${sizeClasses}`}
        onMouseEnter={() => details && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span>🐕</span>
        <span>Dog Friendly</span>
        {details && (
          <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && details && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50 max-w-xs">
          {details}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
