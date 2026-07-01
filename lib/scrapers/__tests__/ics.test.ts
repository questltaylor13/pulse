import { describe, it, expect } from "vitest";
import { parseIcs, parseIcsDateTime } from "@/lib/scrapers/ics";

describe("parseIcsDateTime", () => {
  it("parses a UTC 'Z' time", () => {
    const r = parseIcsDateTime("20260701T010000Z");
    expect(r?.date.toISOString()).toBe("2026-07-01T01:00:00.000Z");
    expect(r?.allDay).toBe(false);
  });

  it("treats a TZID/floating time as America/Denver (MDT = UTC-6 in July)", () => {
    const r = parseIcsDateTime("20260701T190000", { TZID: "America/Denver" });
    // 7pm Denver on a summer day → 01:00 UTC next day.
    expect(r?.date.toISOString()).toBe("2026-07-02T01:00:00.000Z");
  });

  it("treats a TZID/floating time in winter as MST (UTC-7)", () => {
    const r = parseIcsDateTime("20260101T190000", { TZID: "America/Denver" });
    // 7pm Denver in January → 02:00 UTC next day.
    expect(r?.date.toISOString()).toBe("2026-01-02T02:00:00.000Z");
  });

  it("parses an all-day VALUE=DATE", () => {
    const r = parseIcsDateTime("20260701", { VALUE: "DATE" });
    expect(r?.allDay).toBe(true);
    // Denver midnight July 1 → 06:00 UTC.
    expect(r?.date.toISOString()).toBe("2026-07-01T06:00:00.000Z");
  });

  it("returns undefined on garbage", () => {
    expect(parseIcsDateTime("not-a-date")).toBeUndefined();
  });
});

describe("parseIcs", () => {
  const ICS = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:evt-1@example.com",
    "SUMMARY:Jazz at the ballroom",
    "DTSTART;TZID=America/Denver:20260701T190000",
    "DTEND;TZID=America/Denver:20260701T210000",
    "LOCATION:Mission Ballroom",
    "DESCRIPTION:A long description that is folded across",
    " two physical lines with a leading space.",
    "URL:https://example.com/e/1",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:evt-2@example.com",
    "SUMMARY:All-day festival",
    "DTSTART;VALUE=DATE:20260704",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  it("extracts VEVENTs with unfolded, unescaped fields", () => {
    const events = parseIcs(ICS);
    expect(events).toHaveLength(2);

    const [e1, e2] = events;
    expect(e1.summary).toBe("Jazz at the ballroom");
    expect(e1.location).toBe("Mission Ballroom");
    expect(e1.url).toBe("https://example.com/e/1");
    expect(e1.uid).toBe("evt-1@example.com");
    // Folded DESCRIPTION line is joined (leading space removed).
    expect(e1.description).toBe(
      "A long description that is folded acrosstwo physical lines with a leading space.",
    );
    expect(e1.start?.toISOString()).toBe("2026-07-02T01:00:00.000Z");
    expect(e1.end?.toISOString()).toBe("2026-07-02T03:00:00.000Z");

    expect(e2.summary).toBe("All-day festival");
    expect(e2.allDay).toBe(true);
  });
});
