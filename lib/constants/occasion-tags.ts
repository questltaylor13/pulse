export const OCCASION_TAGS = [
  "date-night", "with-friends", "solo", "outdoors",
  "visiting-denver", "rainy-day", "with-the-dog", "special-occasion",
] as const;

export type OccasionTag = (typeof OCCASION_TAGS)[number];

export function isOccasionTag(s: string | null | undefined): s is OccasionTag {
  return !!s && (OCCASION_TAGS as readonly string[]).includes(s);
}

export const OCCASION_LABELS: Record<OccasionTag, string> = {
  "date-night": "Date night",
  "with-friends": "With friends",
  "solo": "Solo",
  "outdoors": "Outdoors",
  "visiting-denver": "Visiting Denver",
  "rainy-day": "Rainy day",
  "with-the-dog": "With the dog",
  "special-occasion": "Special occasion",
};
