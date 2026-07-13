"use client";

// Wave 4 Rate & Rank — the rating flow orchestrator (plan decisions D4/D5).
//
// One bottom sheet, three steps: sentiment → duels → result. The sentiment
// tap fires POST /api/rank/begin, which commits DONE + a provisional entry
// immediately — abandoning mid-duel still records an honest rating at the
// bottom of its sentiment bucket. The duels run the pure binary-search state
// machine from lib/rank-engine/insertion.ts (same module the server uses to
// size the flow); the final index lands via POST /api/rank/place.
//
// Sheet chrome mirrors components/feedback/ActionSheet.tsx (house style).

import { useCallback, useEffect, useRef, useState } from "react";
import type { RankSentiment } from "@prisma/client";
import {
  applyOutcome,
  initialState,
  isResolved,
  opponentIndex,
  resolveIndex,
  type InsertionState,
} from "@/lib/rank-engine/insertion";
import type { RankFlowResult, RankRefClient } from "./types";
import SentimentSheet from "./SentimentSheet";
import ComparisonDuel from "./ComparisonDuel";
import RankResultCard from "./RankResultCard";

interface BucketEntry {
  entryId: string;
  title: string;
  imageUrl: string | null;
}

interface ComparisonLog {
  opponentEntryId: string;
  outcome: "WON" | "LOST" | "SKIPPED";
}

type Step =
  | { kind: "sentiment" }
  | {
      kind: "dueling";
      bucket: BucketEntry[];
      state: InsertionState;
      comparisons: ComparisonLog[];
      maxComparisons: number;
    }
  | {
      kind: "result";
      rank: number;
      categorySize: number;
      categoryLabel: string;
      score: number;
      listPath: string;
    };

export interface RankFlowProps {
  open: boolean;
  refObj: RankRefClient;
  itemTitle: string;
  itemImageUrl?: string | null;
  source: "FEED_CARD" | "DETAIL_PAGE";
  onClose: (result: RankFlowResult) => void;
}

export default function RankFlow({
  open,
  refObj,
  itemTitle,
  itemImageUrl,
  source,
  onClose,
}: RankFlowProps) {
  const [step, setStep] = useState<Step>({ kind: "sentiment" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // DONE recorded (begin or plain been-there succeeded) / placement confirmed
  const committed = useRef(false);
  const ranked = useRef(false);
  // Synchronous re-entry guard: `submitting` state lags a render, so a
  // same-tick double-tap on the resolving duel could fire /api/rank/place
  // twice without this ref.
  const placing = useRef(false);

  // Reset per open
  useEffect(() => {
    if (open) {
      setStep({ kind: "sentiment" });
      setSubmitting(false);
      setErrorMessage(null);
      committed.current = false;
      ranked.current = false;
      placing.current = false;
    }
  }, [open]);

  const close = useCallback(() => {
    onClose({ committed: committed.current, ranked: ranked.current });
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const place = useCallback(
    async (inBucketIndex: number, comparisons: ComparisonLog[]) => {
      if (placing.current) return;
      placing.current = true;
      setSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/rank/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: refObj, inBucketIndex, comparisons }),
        });
        if (!res.ok) throw new Error(`Placement failed (${res.status})`);
        const data = await res.json();
        ranked.current = true;
        setStep({
          kind: "result",
          rank: data.rank,
          categorySize: data.categorySize,
          categoryLabel: data.categoryLabel,
          score: data.score,
          listPath: data.listPath,
        });
      } catch (err) {
        placing.current = false; // allow retry after a failure
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [refObj]
  );

  const selectSentiment = useCallback(
    async (sentiment: RankSentiment) => {
      setSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/rank/begin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: refObj, sentiment, source }),
        });
        if (!res.ok) throw new Error(`Rating failed (${res.status})`);
        const data = await res.json();
        committed.current = true;
        const bucket: BucketEntry[] = data.bucketEntries;
        if (bucket.length === 0) {
          // First in its bucket — no duels, land it.
          await place(0, []);
        } else {
          setStep({
            kind: "dueling",
            bucket,
            state: initialState(bucket.length),
            comparisons: [],
            maxComparisons: data.maxComparisons,
          });
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [refObj, source, place]
  );

  const justMark = useCallback(async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refObj, status: "DONE", source }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      committed.current = true;
      close();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  }, [refObj, source, close]);

  const duel = useCallback(
    (outcome: "WON" | "LOST" | "SKIPPED") => {
      if (step.kind !== "dueling" || submitting) return;
      const opponent = step.bucket[opponentIndex(step.state)];
      const comparisons = [
        ...step.comparisons,
        { opponentEntryId: opponent.entryId, outcome },
      ];
      const nextState = applyOutcome(step.state, outcome);
      if (isResolved(nextState)) {
        void place(resolveIndex(nextState), comparisons);
      } else {
        setStep({ ...step, state: nextState, comparisons });
      }
    },
    [step, submitting, place]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rate this"
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink/25 transition-opacity"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-t-[24px] bg-surface pb-safe animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grip handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        {step.kind === "sentiment" && (
          <SentimentSheet
            itemTitle={itemTitle}
            submitting={submitting}
            onSelect={(s) => void selectSentiment(s)}
            onJustMark={() => void justMark()}
          />
        )}

        {step.kind === "dueling" && (
          <ComparisonDuel
            subject={{ title: itemTitle, imageUrl: itemImageUrl ?? null }}
            opponent={step.bucket[opponentIndex(step.state)]}
            duelNumber={step.state.duels + 1}
            maxDuels={step.maxComparisons}
            submitting={submitting}
            onPick={duel}
            onSkip={() => duel("SKIPPED")}
          />
        )}

        {step.kind === "result" && (
          <RankResultCard
            rank={step.rank}
            categorySize={step.categorySize}
            categoryLabel={step.categoryLabel}
            score={step.score}
            listPath={step.listPath}
            onDone={close}
          />
        )}

        {errorMessage && (
          <div className="mx-5 mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        {step.kind !== "result" && (
          <div className="p-3">
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl bg-mute-hush py-3 text-sm font-medium text-ink hover:bg-mute-divider"
            >
              {step.kind === "dueling" ? "Finish later" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
