export const VIBE_TAGS = [
  "cozy", "chill", "lively", "high-energy",
  "date-spot", "group-friendly", "solo-friendly", "family-friendly",
  "hidden-gem", "neighborhood-spot", "special-occasion", "iconic",
  "big-patio", "dog-friendly", "walkable", "scenic-view",
  "good-for-work", "conversation-friendly", "shareable-plates", "late-night",
  "quiet", "loud", "intimate", "romantic",
] as const;

export type VibeTag = typeof VIBE_TAGS[number];

export function isValidVibeTag(tag: string): tag is VibeTag {
  return (VIBE_TAGS as readonly string[]).includes(tag);
}

export function filterValidVibeTags(tags: string[]): VibeTag[] {
  return tags.filter(isValidVibeTag) as VibeTag[];
}
