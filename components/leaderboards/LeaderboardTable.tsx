"use client";

import Image from "next/image";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  username: string | null;
  profileImageUrl: string | null;
  score: number;
  eventsAttended: number;
  uniquePlaces: number;
  neighborhoodsVisited: number;
  topBadge?: {
    emoji: string;
    name: string;
  };
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  showDetails?: boolean;
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
  2: "bg-gradient-to-r from-slate-300 to-slate-400 text-white",
  3: "bg-gradient-to-r from-amber-600 to-amber-700 text-white",
};

export default function LeaderboardTable({
  entries,
  currentUserId,
  showDetails = false,
}: LeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead className="bg-slate-50 text-left text-sm text-slate-600">
          <tr>
            <th className="py-3 pl-4 pr-2 font-medium">Rank</th>
            <th className="py-3 px-2 font-medium">User</th>
            <th className="py-3 px-2 font-medium text-right">Score</th>
            {showDetails && (
              <>
                <th className="py-3 px-2 font-medium text-right hidden sm:table-cell">
                  Events
                </th>
                <th className="py-3 px-2 font-medium text-right hidden md:table-cell">
                  Places
                </th>
              </>
            )}
            <th className="py-3 pl-2 pr-4 font-medium text-center">Badge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={`transition ${
                  isCurrentUser
                    ? "bg-primary/5 border-l-4 border-l-primary"
                    : "hover:bg-slate-50"
                }`}
              >
                {/* Rank */}
                <td className="py-3 pl-4 pr-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      RANK_STYLES[entry.rank] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {entry.rank}
                  </span>
                </td>

                {/* User */}
                <td className="py-3 px-2">
                  <Link
                    href={entry.username ? `/u/${entry.username}` : "#"}
                    className="flex items-center gap-3 group"
                  >
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                      {entry.profileImageUrl ? (
                        <Image
                          src={entry.profileImageUrl}
                          alt={entry.userName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400 font-medium">
                          {entry.userName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-primary transition">
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </p>
                      {entry.username && (
                        <p className="text-sm text-slate-500">@{entry.username}</p>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Score */}
                <td className="py-3 px-2 text-right">
                  <span className="font-semibold text-slate-900">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">pts</span>
                </td>

                {/* Details */}
                {showDetails && (
                  <>
                    <td className="py-3 px-2 text-right hidden sm:table-cell">
                      <span className="text-slate-600">{entry.eventsAttended}</span>
                    </td>
                    <td className="py-3 px-2 text-right hidden md:table-cell">
                      <span className="text-slate-600">{entry.uniquePlaces}</span>
                    </td>
                  </>
                )}

                {/* Top Badge */}
                <td className="py-3 pl-2 pr-4 text-center">
                  {entry.topBadge ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-sm"
                      title={entry.topBadge.name}
                    >
                      <span>{entry.topBadge.emoji}</span>
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
