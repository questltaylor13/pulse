"use client";

import { useCallback, useState } from "react";
import type { FeedbackSource, ItemStatus } from "@prisma/client";
import type { FeedbackRef } from "./types";

// PRD 5 §1.6 — optimistic client hook. Updates local status immediately on
// user tap, POSTs to /api/feedback, rolls back + surfaces error if the
// request fails. No loading spinners in the UI contract — callers render
// instantly and trust this hook to reconcile.

interface UseFeedbackArgs {
  ref: FeedbackRef;
  initialStatus: ItemStatus | null;
}

interface MutationResult {
  ok: boolean;
  status?: ItemStatus;
  error?: string;
}

export function useFeedback({ ref, initialStatus }: UseFeedbackArgs) {
  const [status, setStatus] = useState<ItemStatus | null>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const upsert = useCallback(
    async (next: ItemStatus, source: FeedbackSource): Promise<MutationResult> => {
      const prev = status;
      setErrorMessage(null);
      setSubmitting(true);
      // Optimistic: update UI immediately
      setStatus(next);

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref, status: next, source }),
        });
        if (!res.ok) {
          // Rollback
          setStatus(prev);
          const body = await res.json().catch(() => ({}));
          const msg = body?.error ?? `Request failed (${res.status})`;
          setErrorMessage(msg);
          return { ok: false, error: msg };
        }
        return { ok: true, status: next };
      } catch (err) {
        setStatus(prev);
        const msg = err instanceof Error ? err.message : "Network error";
        setErrorMessage(msg);
        return { ok: false, error: msg };
      } finally {
        setSubmitting(false);
      }
    },
    [ref, status]
  );

  const remove = useCallback(async (): Promise<MutationResult> => {
    const prev = status;
    setErrorMessage(null);
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });
      if (!res.ok) {
        setStatus(prev);
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? `Request failed (${res.status})`;
        setErrorMessage(msg);
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (err) {
      setStatus(prev);
      const msg = err instanceof Error ? err.message : "Network error";
      setErrorMessage(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, [ref, status]);

  return { status, submitting, errorMessage, upsert, remove };
}
