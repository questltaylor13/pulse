"use client";

import Link from "next/link";
import Image from "next/image";

interface GroupEvent {
  id: string;
  title: string;
  startTime: Date | string;
}

interface GroupMember {
  user: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  members: GroupMember[];
  groupEvents: {
    event: GroupEvent;
  }[];
}

interface GroupActivityCardProps {
  groups: Group[];
}

export default function GroupActivityCard({ groups }: GroupActivityCardProps) {
  if (groups.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Groups</h3>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-slate-600 mb-4">
            Create a group to plan events with friends
          </p>
          <Link
            href="/groups/new"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
          >
            Start a Group
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Your Groups</h3>
        <Link
          href="/groups"
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          See All
        </Link>
      </div>

      <div className="space-y-4">
        {groups.slice(0, 3).map((group) => (
          <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="block p-3 -mx-3 rounded-lg hover:bg-slate-50 transition"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{group.emoji}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 truncate">
                  {group.name}
                </h4>
                <p className="text-sm text-slate-500">
                  {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                </p>

                {/* Recent activity */}
                {group.groupEvents.length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-amber-500">📅</span>
                      Upcoming: {group.groupEvents[0].event.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Member avatars */}
              <div className="flex -space-x-2">
                {group.members.slice(0, 3).map((member) => (
                  <div
                    key={member.user.id}
                    className="h-6 w-6 rounded-full bg-slate-200 border-2 border-white overflow-hidden"
                  >
                    {member.user.profileImageUrl ? (
                      member.user.profileImageUrl.startsWith("http") ? (
                        <img
                          src={member.user.profileImageUrl}
                          alt={member.user.name || ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={member.user.profileImageUrl}
                          alt={member.user.name || ""}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                        {member.user.name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                ))}
                {group.memberCount > 3 && (
                  <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-500">
                    +{group.memberCount - 3}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <Link
          href="/groups/new"
          className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Group
        </Link>
      </div>
    </div>
  );
}
