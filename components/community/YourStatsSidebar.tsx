"use client";

import Link from "next/link";

interface YourStatsSidebarProps {
  rank: number | null;
  score: number | null;
  badgesEarned: number;
  eventsThisMonth?: number;
  currentStreak?: number;
}

export default function YourStatsSidebar({
  rank,
  score,
  badgesEarned,
  eventsThisMonth = 0,
  currentStreak = 0,
}: YourStatsSidebarProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Rank */}
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <p className="text-2xl font-bold text-amber-600">
            {rank ? `#${rank}` : "--"}
          </p>
          <p className="text-xs text-slate-500">Rank</p>
        </div>

        {/* Points */}
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <p className="text-2xl font-bold text-blue-600">
            {score?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-500">Points</p>
        </div>

        {/* Badges */}
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <p className="text-2xl font-bold text-purple-600">{badgesEarned}</p>
          <p className="text-xs text-slate-500">Badges</p>
        </div>

        {/* Streak */}
        <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <p className="text-2xl font-bold text-green-600">
            {currentStreak > 0 ? `${currentStreak}🔥` : "--"}
          </p>
          <p className="text-xs text-slate-500">Week Streak</p>
        </div>
      </div>

      {/* Rank context */}
      {rank && rank <= 10 && (
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 text-center">
          <p className="text-sm font-medium text-amber-800">
            🏆 You&apos;re in the top 10!
          </p>
        </div>
      )}

      {rank && rank > 10 && (
        <div className="mt-4 text-center text-sm text-slate-500">
          {rank <= 25 ? (
            <p>{11 - rank + 10} more points to reach top 10!</p>
          ) : (
            <p>Keep exploring to climb the leaderboard!</p>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <Link
          href="/community/leaderboards"
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          View Full Leaderboard →
        </Link>
      </div>
    </div>
  );
}
