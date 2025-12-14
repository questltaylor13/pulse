"use client";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreStyle(score: number) {
  if (score >= 90) {
    return {
      bg: "bg-gradient-to-r from-green-500 to-emerald-400",
      text: "text-white",
      label: "Perfect Match",
      ring: "ring-green-500/20",
    };
  }
  if (score >= 75) {
    return {
      bg: "bg-gradient-to-r from-blue-500 to-cyan-400",
      text: "text-white",
      label: "Great Match",
      ring: "ring-blue-500/20",
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-gradient-to-r from-yellow-500 to-orange-400",
      text: "text-white",
      label: "Good Match",
      ring: "ring-yellow-500/20",
    };
  }
  return {
    bg: "bg-gray-200",
    text: "text-gray-600",
    label: "You Might Like",
    ring: "ring-gray-200",
  };
}

export default function ScoreBadge({
  score,
  size = "md",
  showLabel = true,
}: ScoreBadgeProps) {
  const style = getScoreStyle(score);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <div
      className={`${style.bg} ${style.text} ${sizeClasses[size]} rounded-full font-medium inline-flex items-center gap-1.5 ring-2 ${style.ring}`}
    >
      <span className="font-bold">{Math.round(score)}%</span>
      {showLabel && <span className="hidden sm:inline">{style.label}</span>}
    </div>
  );
}

// Export a simplified version for compact displays
export function ScoreDot({ score }: { score: number }) {
  const style = getScoreStyle(score);
  return (
    <div
      className={`${style.bg} w-2 h-2 rounded-full`}
      title={`${Math.round(score)}% - ${style.label}`}
    />
  );
}
