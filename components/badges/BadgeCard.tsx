"use client";

import { BadgeTier, BadgeCategory } from "@prisma/client";

interface BadgeCardProps {
  emoji: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  colorHex: string;
  isEarned: boolean;
  progress?: number;
  requirementValue?: number;
  earnedAt?: Date | null;
  isPinned?: boolean;
  onPin?: () => void;
  compact?: boolean;
}

const TIER_STYLES: Record<BadgeTier, { border: string; glow: string }> = {
  BRONZE: { border: "border-amber-600", glow: "shadow-amber-200" },
  SILVER: { border: "border-slate-400", glow: "shadow-slate-200" },
  GOLD: { border: "border-yellow-500", glow: "shadow-yellow-200" },
  PLATINUM: { border: "border-purple-500", glow: "shadow-purple-200" },
};

export default function BadgeCard({
  emoji,
  name,
  description,
  tier,
  colorHex,
  isEarned,
  progress = 0,
  requirementValue = 1,
  earnedAt,
  isPinned,
  onPin,
  compact = false,
}: BadgeCardProps) {
  const tierStyle = TIER_STYLES[tier];
  const progressPercent = Math.min((progress / requirementValue) * 100, 100);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg p-2 ${
          isEarned ? "bg-white" : "bg-slate-50 opacity-60"
        }`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xl ${
            isEarned ? tierStyle.border : "border-slate-200"
          }`}
          style={{ backgroundColor: isEarned ? `${colorHex}20` : undefined }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
          {!isEarned && (
            <div className="h-1 w-full bg-slate-200 rounded-full mt-1">
              <div
                className="h-1 bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl p-4 transition ${
        isEarned
          ? `bg-white border-2 ${tierStyle.border} shadow-lg ${tierStyle.glow}`
          : "bg-slate-50 border border-slate-200 opacity-70"
      }`}
    >
      {/* Pin button */}
      {isEarned && onPin && (
        <button
          onClick={onPin}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 transition"
          title={isPinned ? "Unpin badge" : "Pin to profile"}
        >
          <svg
            className={`w-4 h-4 ${isPinned ? "text-primary" : "text-slate-400"}`}
            fill={isPinned ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      )}

      {/* Badge icon */}
      <div className="flex flex-col items-center text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-3xl mb-3 ${
            isEarned ? tierStyle.border : "border-slate-200"
          }`}
          style={{ backgroundColor: isEarned ? `${colorHex}30` : undefined }}
        >
          {emoji}
        </div>

        {/* Name and tier */}
        <h3 className="font-semibold text-slate-900">{name}</h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
            isEarned
              ? tier === "PLATINUM"
                ? "bg-purple-100 text-purple-700"
                : tier === "GOLD"
                  ? "bg-yellow-100 text-yellow-700"
                  : tier === "SILVER"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {tier}
        </span>

        {/* Description */}
        <p className="text-sm text-slate-600 mt-2">{description}</p>

        {/* Progress or earned date */}
        {isEarned ? (
          earnedAt && (
            <p className="text-xs text-slate-400 mt-2">
              Earned {new Date(earnedAt).toLocaleDateString()}
            </p>
          )
        ) : (
          <div className="w-full mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>
                {progress} / {requirementValue}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full">
              <div
                className="h-2 bg-primary rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
