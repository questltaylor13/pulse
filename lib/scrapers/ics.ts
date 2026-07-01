/**
 * Wave 2 — reusable iCalendar (.ics) scraper factory for license-clean civic
 * feeds (Denver Arts & Venues, libraries, universities, rec centers, …).
 *
 * The parser is a minimal but correct RFC-5545 subset: line unfolding, VEVENT
 * extraction, property params, text unescaping, and DTSTART/DTEND parsing for
 * the three common forms (UTC "Z", floating/TZID → treated as America/Denver,
 * and all-day VALUE=DATE). Recurrence (RRULE) is not expanded — the DTSTART
 * occurrence is used. Pure functions (parseIcs / parseIcsDateTime) are
 * unit-tested; makeIcsScraper adds the fetch.
 */

import type { Category } from "@prisma/client";
import { denverWallClockToUtc } from "@/lib/time/denver";
import type { ScrapedEvent, Scraper } from "./types";

export interface IcsEvent {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  url?: string;
  start?: Date;
  end?: Date;
  allDay: boolean;
}

interface RawProp {
  params: Record<string, string>;
  value: string;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/** Parse an ICS date/time value into a UTC Date. Floating/TZID times are
 * interpreted as America/Denver (correct for Denver civic feeds). */
export function parseIcsDateTime(
  value: string,
  params: Record<string, string> = {},
): { date: Date; allDay: boolean } | undefined {
  const v = value.trim();

  // All-day (VALUE=DATE or bare YYYYMMDD).
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly || params.VALUE === "DATE") {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return undefined;
    return {
      date: denverWallClockToUtc(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0, 0, 0),
      allDay: true,
    };
  }

  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(v);
  if (!dt) return undefined;
  const [, y, mo, d, h, mi, s, z] = dt;
  if (z === "Z") {
    return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  }
  // Floating or TZID (assume America/Denver) → Denver wall-clock.
  return { date: denverWallClockToUtc(+y, +mo, +d, +h, +mi, +s, 0), allDay: false };
}

/** Parse ICS text into VEVENTs. */
export function parseIcs(text: string): IcsEvent[] {
  // Normalize line endings + unfold continuation lines (RFC 5545 §3.1).
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");

  const events: IcsEvent[] = [];
  let cur: Record<string, RawProp> | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (cur) events.push(buildEvent(cur));
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const namePart = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    const [name, ...paramParts] = namePart.split(";");
    const params: Record<string, string> = {};
    for (const p of paramParts) {
      const eq = p.indexOf("=");
      if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    }
    cur[name.toUpperCase()] = { params, value };
  }
  return events;
}

function buildEvent(props: Record<string, RawProp>): IcsEvent {
  const start = props.DTSTART ? parseIcsDateTime(props.DTSTART.value, props.DTSTART.params) : undefined;
  const end = props.DTEND ? parseIcsDateTime(props.DTEND.value, props.DTEND.params) : undefined;
  return {
    uid: props.UID?.value,
    summary: props.SUMMARY ? unescapeText(props.SUMMARY.value) : undefined,
    description: props.DESCRIPTION ? unescapeText(props.DESCRIPTION.value) : undefined,
    location: props.LOCATION ? unescapeText(props.LOCATION.value) : undefined,
    url: props.URL?.value,
    start: start?.date,
    end: end?.date,
    allDay: start?.allDay ?? false,
  };
}

export interface IcsScraperConfig {
  /** Unique source key (also written to ScraperRun.source + SOURCE_PRIORITY). */
  source: string;
  /** Public .ics URL. */
  url: string;
  venueName: string;
  address: string;
  neighborhood?: string;
  category: Category;
  tags?: string[];
  /** Only include events starting within this many days (default 90). */
  horizonDays?: number;
}

/** Build a Scraper from an ICS feed config. */
export function makeIcsScraper(config: IcsScraperConfig): Scraper {
  return async () => {
    const errors: string[] = [];
    try {
      const res = await fetch(config.url, {
        headers: { "User-Agent": "PulseBot/1.0 (+https://pulse.app)" },
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) {
        return { source: config.source, events: [], errors: [`${config.source}: HTTP ${res.status}`] };
      }
      const text = await res.text();
      const parsed = parseIcs(text);

      const now = Date.now();
      const horizon = now + (config.horizonDays ?? 90) * 24 * 60 * 60 * 1000;
      const events: ScrapedEvent[] = [];
      for (const ev of parsed) {
        if (!ev.summary || !ev.start) continue;
        const startMs = ev.start.getTime();
        if (startMs < now || startMs > horizon) continue; // upcoming only
        events.push({
          title: ev.summary,
          description: ev.description ?? "",
          category: config.category,
          tags: config.tags ?? [],
          venueName: config.venueName,
          address: config.address,
          neighborhood: config.neighborhood,
          startTime: ev.start,
          endTime: ev.end,
          priceRange: "",
          source: config.source,
          sourceUrl: ev.url,
          externalId: ev.uid,
        });
      }
      return { source: config.source, events, errors };
    } catch (err) {
      return {
        source: config.source,
        events: [],
        errors: [`${config.source}: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  };
}
