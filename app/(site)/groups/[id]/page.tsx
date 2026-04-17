"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GroupRole, GroupEventStatus } from "@prisma/client";

interface GroupMember {
  id: string;
  userId: string;
  role: GroupRole;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    profileImageUrl: string | null;
  };
}

interface GroupEvent {
  id: string;
  eventId: string;
  status: GroupEventStatus;
  votesYes: string[];
  votesNo: string[];
  votesMaybe: string[];
  event: {
    id: string;
    title: string;
    venueName: string;
    startTime: string;
    neighborhood: string | null;
    imageUrl: string | null;
  };
  suggestedBy: {
    id: string;
    name: string | null;
    username: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  joinCode: string;
  isPublic: boolean;
  memberCount: number;
  members: GroupMember[];
  groupEvents: GroupEvent[];
  isMember: boolean;
  userRole: GroupRole | null;
}

type Tab = "events" | "members" | "settings";

export default function GroupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchGroup();
  }, [session, status, router, id]);

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
      } else if (response.status === 404) {
        router.push("/groups");
      }
    } catch (error) {
      console.error("Failed to fetch group:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (groupEventId: string, vote: "yes" | "no" | "maybe") => {
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", groupEventId, vote }),
      });

      if (response.ok) {
        const { groupEvent } = await response.json();
        setGroup((prev) =>
          prev
            ? {
                ...prev,
                groupEvents: prev.groupEvents.map((ge) =>
                  ge.id === groupEventId ? groupEvent : ge
                ),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });

      if (response.ok) {
        router.push("/groups");
      }
    } catch (error) {
      console.error("Failed to leave group:", error);
    }
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Group not found</p>
      </div>
    );
  }

  const isOwner = group.userRole === GroupRole.OWNER;
  const isAdmin = group.userRole === GroupRole.ADMIN || isOwner;

  const votingEvents = group.groupEvents.filter(
    (ge) => ge.status === GroupEventStatus.VOTING || ge.status === GroupEventStatus.SUGGESTED
  );
  const confirmedEvents = group.groupEvents.filter(
    (ge) => ge.status === GroupEventStatus.CONFIRMED
  );
  const pastEvents = group.groupEvents.filter(
    (ge) => ge.status === GroupEventStatus.ATTENDED || ge.status === GroupEventStatus.PASSED
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-4xl">
            {group.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
              {isOwner && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Owner
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-slate-600 mb-2">{group.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{group.memberCount} members</span>
              <span>{group.groupEvents.length} events</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            >
              Invite
            </button>
            <Link
              href="/groups"
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Invite Friends
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              Share this code with friends to invite them to join:
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-slate-100 rounded-lg px-4 py-3 text-center text-2xl font-mono font-bold tracking-wider">
                {group.joinCode}
              </div>
              <button
                onClick={copyInviteCode}
                className="rounded-lg bg-primary px-4 py-3 text-white hover:bg-primary/90 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setShowInvite(false)}
              className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Events ({group.groupEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Members ({group.memberCount})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "events" && (
        <div className="space-y-6">
          {/* Voting Events */}
          {votingEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Vote on Events
              </h2>
              <div className="space-y-4">
                {votingEvents.map((ge) => (
                  <div key={ge.id} className="card">
                    <div className="flex gap-4">
                      {ge.event.imageUrl && (
                        <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <Image
                            src={ge.event.imageUrl}
                            alt={ge.event.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/events/${ge.event.id}`}
                          className="font-semibold text-slate-900 hover:text-primary transition"
                        >
                          {ge.event.title}
                        </Link>
                        <p className="text-sm text-slate-600">
                          {ge.event.venueName}
                          {ge.event.neighborhood && ` • ${ge.event.neighborhood}`}
                        </p>
                        <p className="text-sm text-primary">
                          {new Date(ge.event.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Suggested by {ge.suggestedBy.name || "Someone"}
                        </p>
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleVote(ge.id, "yes")}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          ge.votesYes.includes(session?.user?.id || "")
                            ? "bg-green-500 text-white"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        Yes ({ge.votesYes.length})
                      </button>
                      <button
                        onClick={() => handleVote(ge.id, "maybe")}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          ge.votesMaybe.includes(session?.user?.id || "")
                            ? "bg-amber-500 text-white"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        Maybe ({ge.votesMaybe.length})
                      </button>
                      <button
                        onClick={() => handleVote(ge.id, "no")}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          ge.votesNo.includes(session?.user?.id || "")
                            ? "bg-red-500 text-white"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        No ({ge.votesNo.length})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Events */}
          {confirmedEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Confirmed Events
              </h2>
              <div className="space-y-4">
                {confirmedEvents.map((ge) => (
                  <Link
                    key={ge.id}
                    href={`/events/${ge.event.id}`}
                    className="card block hover:shadow-lg transition"
                  >
                    <div className="flex gap-4">
                      {ge.event.imageUrl && (
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <Image
                            src={ge.event.imageUrl}
                            alt={ge.event.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">
                          {ge.event.title}
                        </h3>
                        <p className="text-sm text-slate-600">{ge.event.venueName}</p>
                        <p className="text-sm text-primary">
                          {new Date(ge.event.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-green-600 text-sm font-medium">
                        {ge.votesYes.length} going
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {group.groupEvents.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-slate-600 mb-4">
                No events suggested yet. Browse events and suggest one to the group!
              </p>
              <Link
                href="/feed"
                className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Browse Events
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "members" && (
        <div className="card">
          <div className="divide-y divide-slate-100">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-100">
                  {member.user.profileImageUrl ? (
                    <Image
                      src={member.user.profileImageUrl}
                      alt={member.user.name || "Member"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-medium">
                      {member.user.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {member.user.name || "Unknown"}
                    {member.userId === session?.user?.id && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </p>
                  {member.user.username && (
                    <p className="text-sm text-slate-500">@{member.user.username}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    member.role === GroupRole.OWNER
                      ? "bg-primary/10 text-primary"
                      : member.role === GroupRole.ADMIN
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "settings" && isAdmin && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Group Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Join Code</p>
                  <p className="text-sm text-slate-500">Share with friends</p>
                </div>
                <code className="bg-white px-4 py-2 rounded-lg font-mono font-bold">
                  {group.joinCode}
                </code>
              </div>
            </div>
          </div>

          <div className="card border-red-200">
            <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
            <button
              onClick={handleLeave}
              className="w-full rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition"
            >
              Leave Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
