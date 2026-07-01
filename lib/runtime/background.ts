import "server-only";
import { waitUntil } from "@vercel/functions";

/**
 * Run best-effort work AFTER the HTTP response is sent, without blocking it.
 *
 * On Vercel (Fluid Compute) this uses `waitUntil` so the platform keeps the
 * function alive until the work settles. Off-platform (local dev, tests, or
 * any non-request context) `waitUntil` throws, so we fall back to a detached
 * promise — Node keeps the event loop alive long enough locally.
 *
 * The work's own errors are swallowed (logged), so a background failure can
 * never reject into the caller's request path.
 */
export function runAfterResponse(work: () => Promise<unknown>): void {
  let promise: Promise<unknown>;
  try {
    promise = Promise.resolve(work());
  } catch (err) {
    console.error("[background] task threw synchronously:", err);
    return;
  }
  const safe = promise.catch((err) => {
    console.error("[background] task failed:", err);
  });
  try {
    waitUntil(safe);
  } catch {
    // Not inside a Vercel request context — best-effort detached promise.
    void safe;
  }
}
