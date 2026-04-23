import type { ItemStatus } from "@prisma/client";
import { STATUS_TO_PILL_TEXT } from "@/lib/feedback/types";

// PRD 5 §1.3 — small pill shown on a card after feedback is given.
// WANT → teal "Interested"; DONE → purple "Been there"; PASS → no pill
// (the card is filtered out of the feed instead).

interface Props {
  status: ItemStatus | null | undefined;
  size?: "sm" | "md";
}

export default function FeedbackTag({ status, size = "sm" }: Props) {
  if (!status) return null;
  const text = STATUS_TO_PILL_TEXT[status];
  if (!text) return null;

  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const colorClass =
    status === "WANT"
      ? "bg-teal-soft text-teal"
      : "bg-purple-100 text-purple-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${colorClass} ${padding}`}
    >
      ✓ {text}
    </span>
  );
}
