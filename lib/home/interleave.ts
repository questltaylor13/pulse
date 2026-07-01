/**
 * Round-robin merge of two arrays: a[0], b[0], a[1], b[1], … Ensures neither
 * side starves when the result is later truncated (Wave 2 fix for the
 * "Outside the city" rail, which concatenated events-then-places and sliced to
 * 15 — so with ≥15 events, places never appeared).
 */
export function interleave<A, B>(a: A[], b: B[]): Array<A | B> {
  const out: Array<A | B> = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
