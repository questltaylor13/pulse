"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GroupCard from "@/components/groups/GroupCard";
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

interface Group {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  memberCount: number;
  members: GroupMember[];
  role: GroupRole;
  groupEvents: GroupEvent[];
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchGroups();
  }, [session, status, router]);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoining(true);
    setJoinError("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", joinCode: joinCode.trim() }),
      });

      if (response.ok) {
        const { group } = await response.json();
        router.push(`/groups/${group.id}`);
      } else {
        const { error } = await response.json();
        setJoinError(error || "Failed to join group");
      }
    } catch (error) {
      setJoinError("Something went wrong");
    } finally {
      setJoining(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Groups</h1>
          <p className="text-slate-600">Plan events together with friends</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/community"
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Community
          </Link>
          <Link
            href="/groups/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            + Create Group
          </Link>
        </div>
      </div>

      {/* Join by Code */}
      <div className="card bg-slate-50">
        <h2 className="font-semibold text-slate-900 mb-3">Join a Group</h2>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter join code (e.g., WKND25)"
            maxLength={6}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
          />
          <button
            type="submit"
            disabled={joining || !joinCode.trim()}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </form>
        {joinError && <p className="mt-2 text-sm text-red-600">{joinError}</p>}
      </div>

      {/* Groups Grid */}
      {groups.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              id={group.id}
              name={group.name}
              emoji={group.emoji}
              description={group.description}
              memberCount={group.memberCount}
              members={group.members}
              role={group.role}
              upcomingEvents={group.groupEvents}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No groups yet
          </h3>
          <p className="text-slate-600 mb-4">
            Create a group or join one with a code to start planning events together.
          </p>
          <Link
            href="/groups/new"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            Create Your First Group
          </Link>
        </div>
      )}
    </div>
  );
}
