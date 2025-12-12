"use client";

import Image from "next/image";
import Link from "next/link";
import { GroupRole } from "@prisma/client";

interface GroupMember {
  user: {
    id: string;
    name: string | null;
    profileImageUrl: string | null;
  };
}

interface GroupEvent {
  event: {
    id: string;
    title: string;
    startTime: Date;
  };
}

interface GroupCardProps {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  memberCount: number;
  members: GroupMember[];
  role?: GroupRole;
  upcomingEvents?: GroupEvent[];
}

export default function GroupCard({
  id,
  name,
  emoji,
  description,
  memberCount,
  members,
  role,
  upcomingEvents = [],
}: GroupCardProps) {
  return (
    <Link href={`/groups/${id}`} className="block group">
      <div className="card hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition">
                {name}
              </h3>
              {role === GroupRole.OWNER && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Owner
                </span>
              )}
              {role === GroupRole.ADMIN && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{memberCount} members</p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">{description}</p>
        )}

        {/* Member avatars */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, index) => (
              <div
                key={member.user.id}
                className="relative h-8 w-8 rounded-full overflow-hidden bg-slate-100 border-2 border-white"
                style={{ zIndex: 5 - index }}
              >
                {member.user.profileImageUrl ? (
                  <Image
                    src={member.user.profileImageUrl}
                    alt={member.user.name || "Member"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    {member.user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            ))}
            {memberCount > 5 && (
              <div className="relative h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-500 font-medium">
                +{memberCount - 5}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Upcoming
            </p>
            <div className="space-y-1">
              {upcomingEvents.slice(0, 2).map((ge) => (
                <div key={ge.event.id} className="flex items-center gap-2 text-sm">
                  <span className="text-primary">
                    {new Date(ge.event.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-slate-600 truncate">{ge.event.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
