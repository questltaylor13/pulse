/**
 * Wave 6A — the identity of an event series across its occurrences.
 *
 * Two Event rows belong to the same series iff they produce the same key, which
 * makes this the most consequential pure function in the wave. Too loose and
 * "Trivia Night" merges with "Trivia Night: Grand Finals"; too tight and the
 * series splits the moment a source reformats its titles.
 *
 * Deliberately derived from title + venue rather than from the source's own id,
 * because the whole problem is that sources disagree about what an id MEANS:
 * Westword's externalId is series-stable (one id, many weeks), do303's is
 * per-occurrence (one id per night). Neither can be trusted as series identity.
 */

import { normalizeVenueName } from "@/lib/scrapers/venue-match";

/**
 * A leading date or weekday, e.g. "Tuesday: ", "Tue - ", "7/15 - ", "July 15: ".
 *
 * The trailing delimiter is REQUIRED, and that is the whole subtlety here. A
 * prefix followed only by whitespace is not a date prefix — it is a title.
 * "March for Science" starts with a month name; stripping it would leave "for
 * Science" and quietly merge that rally with every other event at Civic Center.
 * Demanding a ':' / '-' / ',' / '/' keeps the month-word case safe.
 */
const DATE_PREFIX_RX = new RegExp(
  "^\\s*(?:" +
    // Weekday, long or short: Mon, Tues, Tuesday, Thurs, Sat…
    "(?:mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?|sun)(?:day)?" +
    // Month, optionally with a day: "July", "July 15", "Sept 3".
    // The full names are listed FIRST and the abbreviations are \\b-anchored, so a
    // month branch can never swallow a word that merely BEGINS with one:
    // "Decadence: NYE" must not become "NYE" (it would then merge with every other
    // NYE event at that venue), and "Mayday: The Musical" must not become
    // "The Musical". The earlier greedy [a-z]* did exactly that.
    "|(?:january|february|march|april|may|june|july|august|september|october|november|december" +
    "|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\\b\\s*\\d{0,2}" +
    // Numeric date: 7/15, 7-15, 7.15.26
    "|\\d{1,2}[\\/.\\-]\\d{1,2}(?:[\\/.\\-]\\d{2,4})?" +
    ")\\s*[:\\-–—,\\/]+\\s*",
  "i"
);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // punctuation out
    .replace(/[\s_]+/g, "-") // whitespace to hyphens
    .replace(/-+/g, "-") // collapse runs
    .replace(/^-|-$/g, ""); // trim
}

export function deriveSeriesKey(title: string, venueName: string): string {
  const stripped = title.replace(DATE_PREFIX_RX, "");
  // A title that is ONLY a date normalizes to "" once stripped. Falling back to
  // the raw title keeps "7/15" and "7/22" apart, rather than collapsing every
  // such event at a venue into one enormous bogus series.
  const t = normalize(stripped) || normalize(title);
  // The venue half reuses the scrapers' tested venue normalizer rather than a
  // second opinion about what a venue name is. It already handles a leading
  // "The", "&" → "and", and diacritics — so "The Ogden Theatre" and "Ogden
  // Theatre" resolve to one venue instead of silently splitting the series.
  const v = normalizeVenueName(venueName).replace(/\s+/g, "-");
  return `${t}|${v}`;
}
