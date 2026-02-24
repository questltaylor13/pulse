"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  type: "event" | "group" | "labs" | "invitation";
  status?: "GOING" | "MAYBE" | "PENDING";
  color?: string;
  venueName?: string;
  neighborhood?: string;
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch events when date changes
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, view]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?view=${view}&date=${currentDate.toISOString()}`
      );
      const data = await res.json();

      // Transform all event types into unified format
      const allEvents: CalendarEvent[] = [
        ...data.myEvents.map((e: any) => ({
          id: e.event.id,
          title: e.event.title,
          startTime: new Date(e.event.startTime),
          type: "event" as const,
          status: "GOING" as const,
          color: getCategoryColor(e.event.category),
          venueName: e.event.venueName,
          neighborhood: e.event.neighborhood,
        })),
        ...data.groupEvents.map((e: any) => ({
          id: `group-${e.id}`,
          title: `${e.group.emoji} ${e.event.title}`,
          startTime: new Date(e.event.startTime),
          type: "group" as const,
          status: "GOING" as const,
          color: "bg-purple-500",
          venueName: e.event.venueName,
          neighborhood: e.event.neighborhood,
        })),
        ...data.labsEvents.map((e: any) => ({
          id: `labs-${e.labsItem.id}`,
          title: `🧪 ${e.labsItem.title}`,
          startTime: new Date(e.labsItem.startTime),
          type: "labs" as const,
          status: "GOING" as const,
          color: "bg-indigo-500",
          venueName: e.labsItem.venueName,
          neighborhood: e.labsItem.neighborhood,
        })),
        ...data.invitations.map((e: any) => ({
          id: `invite-${e.id}`,
          title: e.event.title,
          startTime: new Date(e.event.startTime),
          type: "invitation" as const,
          status: "PENDING" as const,
          color: "bg-yellow-500",
          venueName: e.event.venueName,
          neighborhood: e.event.neighborhood,
        })),
      ];

      setEvents(allEvents);
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      LIVE_MUSIC: "bg-pink-500",
      FOOD: "bg-orange-500",
      ART: "bg-violet-500",
      BARS: "bg-amber-500",
      COFFEE: "bg-yellow-600",
      OUTDOORS: "bg-green-500",
      FITNESS: "bg-blue-500",
      SEASONAL: "bg-red-500",
      POPUP: "bg-teal-500",
    };
    return colors[category] || "bg-gray-500";
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day));
  };

  const navigatePrev = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const displayDays = view === "month" ? calendarDays : weekDays;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentDate, view === "month" ? "MMMM yyyy" : "'Week of' MMM d, yyyy")}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === "month"
                ? "bg-white shadow-sm font-medium"
                : "hover:bg-gray-200"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === "week"
                ? "bg-white shadow-sm font-medium"
                : "hover:bg-gray-200"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {displayDays.map((day: Date, index: number) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border-b border-r cursor-pointer
                  hover:bg-gray-50 transition-colors
                  ${!isCurrentMonth && view === "month" ? "bg-gray-50 text-gray-400" : ""}
                  ${isSelected ? "bg-blue-50" : ""}
                `}
                onClick={() => setSelectedDate(day)}
              >
                {/* Day Number */}
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? "bg-primary text-white" : ""}
                    `}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <CalendarEventPill
                      key={event.id}
                      event={event}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Day Detail */}
      {selectedDate && (
        <div className="border-t p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="space-y-2">
            {getEventsForDay(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-sm">No events on this day</p>
            ) : (
              getEventsForDay(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => onEventClick?.(event)}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${event.color || "bg-gray-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(event.startTime), "h:mm a")}
                      {event.venueName && ` • ${event.venueName}`}
                    </p>
                  </div>
                  {event.status === "PENDING" && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Invite
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Event Pill Component
function CalendarEventPill({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  const statusStyles = {
    GOING: "bg-green-100 text-green-800 border-green-200",
    MAYBE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PENDING: "bg-orange-100 text-orange-800 border-orange-200 animate-pulse",
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left text-xs px-2 py-1 rounded truncate border
        ${statusStyles[event.status || "GOING"]}
        hover:opacity-80 transition-opacity
      `}
    >
      {event.status === "PENDING" && "📩 "}
      {event.title}
    </button>
  );
}
