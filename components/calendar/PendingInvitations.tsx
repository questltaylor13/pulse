"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Mail, Calendar, MapPin, Check, X } from "lucide-react";
import Link from "next/link";

interface Invitation {
  id: string;
  message?: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    venueName: string;
    neighborhood?: string;
  };
  inviter?: {
    id: string;
    name: string;
    username?: string;
    profileImageUrl?: string;
  };
  group?: {
    id: string;
    name: string;
    emoji: string;
  };
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/calendar/invitations?status=PENDING");
      const data = await res.json();
      setInvitations(data.invitations || []);
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (
    invitationId: string,
    response: "ACCEPTED" | "DECLINED" | "MAYBE"
  ) => {
    setResponding(invitationId);
    try {
      const res = await fetch("/api/calendar/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, response }),
      });

      if (res.ok) {
        setInvitations(invitations.filter((i) => i.id !== invitationId));
      }
    } catch {
      /* silently handled */
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-yellow-600" />
        <h3 className="font-semibold text-yellow-800">
          {invitations.length} Pending Invitation
          {invitations.length > 1 ? "s" : ""}
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-white rounded-lg p-4 border border-yellow-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Who invited */}
                <p className="text-sm text-gray-600 mb-1">
                  {invitation.group ? (
                    <span>
                      {invitation.group.emoji} {invitation.group.name} invited
                      you
                    </span>
                  ) : invitation.inviter ? (
                    <span>
                      <Link
                        href={`/u/${invitation.inviter.username || invitation.inviter.id}`}
                        className="font-medium hover:underline"
                      >
                        {invitation.inviter.name}
                      </Link>{" "}
                      invited you
                    </span>
                  ) : (
                    <span>You&apos;re invited</span>
                  )}
                </p>

                {/* Event title */}
                <h4 className="font-semibold text-gray-900 truncate">
                  {invitation.event.title}
                </h4>

                {/* Event details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(
                      new Date(invitation.event.startTime),
                      "EEE, MMM d • h:mm a"
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {invitation.event.venueName}
                    {invitation.event.neighborhood && (
                      <span className="text-gray-400">
                        • {invitation.event.neighborhood}
                      </span>
                    )}
                  </span>
                </div>

                {/* Message */}
                {invitation.message && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    &ldquo;{invitation.message}&rdquo;
                  </p>
                )}
              </div>

              {/* Response Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRespond(invitation.id, "ACCEPTED")}
                  disabled={responding === invitation.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Going
                </button>
                <button
                  onClick={() => handleRespond(invitation.id, "MAYBE")}
                  disabled={responding === invitation.id}
                  className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Maybe
                </button>
                <button
                  onClick={() => handleRespond(invitation.id, "DECLINED")}
                  disabled={responding === invitation.id}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
