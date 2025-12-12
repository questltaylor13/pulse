/**
 * Calendar and sharing utilities for events
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date | null;
  url?: string;
}

/**
 * Generate an ICS file content for downloading
 */
export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  };

  const endTime = event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pulse Denver//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `DTSTAMP:${formatDate(now)}`,
    `UID:${Date.now()}@pulse-denver.com`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}${event.url ? `\\n\\nMore info: ${event.url}` : ""}`,
    `LOCATION:${escapeText(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Download an ICS file
 */
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const endTime = event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(endTime)}`,
    details: event.description + (event.url ? `\n\nMore info: ${event.url}` : ""),
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const endTime = event.endTime || new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description + (event.url ? `\n\nMore info: ${event.url}` : ""),
    location: event.location,
    startdt: event.startTime.toISOString(),
    enddt: endTime.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

/**
 * Add to calendar with provider selection
 */
export type CalendarProvider = "google" | "outlook" | "apple" | "ics";

export function addToCalendar(event: CalendarEvent, provider: CalendarProvider): void {
  switch (provider) {
    case "google":
      window.open(getGoogleCalendarUrl(event), "_blank");
      break;
    case "outlook":
      window.open(getOutlookCalendarUrl(event), "_blank");
      break;
    case "apple":
    case "ics":
      downloadICS(event);
      break;
  }
}

/**
 * Share event using Web Share API or fallback
 */
export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export async function shareEvent(data: ShareData): Promise<boolean> {
  // Check if Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      // User cancelled or error - fall through to clipboard
      if ((error as Error).name === "AbortError") {
        return false;
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(data.url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy event link to clipboard
 */
export async function copyEventLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Generate shareable event URL
 */
export function getEventShareUrl(eventId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/events/${eventId}`;
}

/**
 * Generate social share URLs
 */
export function getTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({ u: url });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function getLinkedInShareUrl(url: string, title?: string): string {
  const params = new URLSearchParams({ url });
  if (title) params.set("title", title);
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function getWhatsAppShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function getEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
