"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { Calendar, MapPin, Download, Users, Beaker } from "lucide-react";
import Link from "next/link";

interface UpcomingEvent {
  id: string;
  title: string;
  startTime: string;
  venueName: string;
  type: "event" | "group" | "labs";
  groupEmoji?: string;
}

interface CalendarStats {
  eventsThisWeek: number;
  groupPlans: number;
  pendingInvites: number;
}

export function CalendarSidebar() {
  const [stats, setStats] = useState<CalendarStats>({
    eventsThisWeek: 0,
    groupPlans: 0,
    pendingInvites: 0,
  });
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      // Fetch this week's calendar data
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

      const res = await fetch(
        `/api/calendar?view=week&date=${new Date().toISOString()}`
      );
      const data = await res.json();

      // Calculate stats
      const eventsThisWeek = data.myEvents?.length || 0;
      const groupPlans = data.groupEvents?.length || 0;
      const pendingInvites = data.invitations?.length || 0;

      setStats({ eventsThisWeek, groupPlans, pendingInvites });

      // Get upcoming events (next 5)
      const allUpcoming: UpcomingEvent[] = [
        ...(data.myEvents || []).map((e: any) => ({
          id: e.event.id,
          title: e.event.title,
          startTime: e.event.startTime,
          venueName: e.event.venueName,
          type: "event" as const,
        })),
        ...(data.groupEvents || []).map((e: any) => ({
          id: e.event.id,
          title: e.event.title,
          startTime: e.event.startTime,
          venueName: e.event.venueName,
          type: "group" as const,
          groupEmoji: e.group.emoji,
        })),
        ...(data.labsEvents || []).map((e: any) => ({
          id: e.labsItem.id,
          title: e.labsItem.title,
          startTime: e.labsItem.startTime,
          venueName: e.labsItem.venueName || "Virtual",
          type: "labs" as const,
        })),
      ]
        .filter((e) => new Date(e.startTime) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .slice(0, 5);

      setUpcoming(allUpcoming);
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold mb-3">This Week</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events
            </span>
            <span className="font-medium">{stats.eventsThisWeek}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Group Plans
            </span>
            <span className="font-medium">{stats.groupPlans}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pending Invites
            </span>
            <span
              className={`font-medium ${stats.pendingInvites > 0 ? "text-yellow-600" : ""}`}
            >
              {stats.pendingInvites}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold mb-3">Coming Up</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
              <UpcomingEventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold mb-3">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Going</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Maybe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Group Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Labs Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
            <span>Pending Invite</span>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold mb-3">Sync Calendar</h3>
        <p className="text-sm text-gray-600 mb-3">
          Export your Pulse events to Google Calendar, Apple Calendar, or
          Outlook.
        </p>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
          <Download className="w-4 h-4" />
          Export .ics
        </button>
      </div>
    </div>
  );
}

function UpcomingEventItem({ event }: { event: UpcomingEvent }) {
  const isToday = isSameDay(new Date(event.startTime), new Date());

  const getIcon = () => {
    switch (event.type) {
      case "group":
        return <span className="text-sm">{event.groupEmoji}</span>;
      case "labs":
        return <Beaker className="w-4 h-4 text-indigo-500" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Link
      href={event.type === "labs" ? `/labs/${event.id}` : `/events/${event.id}`}
      className="block p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{event.title}</p>
          <p className="text-xs text-gray-500">
            {isToday ? (
              <span className="text-primary font-medium">
                Today at {format(new Date(event.startTime), "h:mm a")}
              </span>
            ) : (
              format(new Date(event.startTime), "EEE, MMM d • h:mm a")
            )}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {event.venueName}
          </p>
        </div>
      </div>
    </Link>
  );
}
