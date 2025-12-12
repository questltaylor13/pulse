"use client";

import { BadgeCategory } from "@prisma/client";
import BadgeCard from "./BadgeCard";

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  emoji: string;
  colorHex: string;
  isHidden: boolean;
  requirementType: string;
  requirementValue: number;
  progress: number;
  isEarned: boolean;
  earnedAt: Date | null;
  isPinned: boolean;
}

interface BadgeGridProps {
  badges: Badge[];
  onPin?: (badgeId: string) => void;
  showCategories?: boolean;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  MILESTONE: "Milestones",
  EXPLORER: "Explorer",
  CATEGORY_FAN: "Category Fan",
  STREAK: "Streaks",
  SOCIAL: "Social",
  PIONEER: "Pioneer",
  SPECIAL: "Special",
};

const CATEGORY_ORDER: BadgeCategory[] = [
  "MILESTONE",
  "EXPLORER",
  "CATEGORY_FAN",
  "STREAK",
  "SOCIAL",
  "PIONEER",
  "SPECIAL",
];

export default function BadgeGrid({
  badges,
  onPin,
  showCategories = true,
  compact = false,
}: BadgeGridProps) {
  if (!showCategories) {
    return (
      <div
        className={`grid gap-4 ${
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            emoji={badge.emoji}
            name={badge.name}
            description={badge.description}
            tier={badge.tier}
            category={badge.category}
            colorHex={badge.colorHex}
            isEarned={badge.isEarned}
            progress={badge.progress}
            requirementValue={badge.requirementValue}
            earnedAt={badge.earnedAt}
            isPinned={badge.isPinned}
            onPin={onPin ? () => onPin(badge.id) : undefined}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  // Group by category
  const badgesByCategory = CATEGORY_ORDER.reduce(
    (acc, category) => {
      const categoryBadges = badges.filter((b) => b.category === category);
      if (categoryBadges.length > 0) {
        acc[category] = categoryBadges;
      }
      return acc;
    },
    {} as Record<BadgeCategory, Badge[]>
  );

  return (
    <div className="space-y-8">
      {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {CATEGORY_LABELS[category as BadgeCategory]}
          </h3>
          <div
            className={`grid gap-4 ${
              compact
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            }`}
          >
            {categoryBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                emoji={badge.emoji}
                name={badge.name}
                description={badge.description}
                tier={badge.tier}
                category={badge.category}
                colorHex={badge.colorHex}
                isEarned={badge.isEarned}
                progress={badge.progress}
                requirementValue={badge.requirementValue}
                earnedAt={badge.earnedAt}
                isPinned={badge.isPinned}
                onPin={onPin ? () => onPin(badge.id) : undefined}
                compact={compact}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
