"use client";

// Wave 4 Rate & Rank — step 2: photo head-to-head. "Which was better?"
// Two tappable cards (subject vs an already-ranked opponent), a "too close
// to call" escape hatch, and progress dots. Scores stay hidden — this is a
// gut call, not a math quiz.

import InitialThumb from "@/components/ui/InitialThumb";

interface DuelCard {
  title: string;
  imageUrl: string | null;
}

interface Props {
  subject: DuelCard;
  opponent: DuelCard;
  duelNumber: number; // 1-based
  maxDuels: number;
  submitting: boolean;
  onPick: (outcome: "WON" | "LOST") => void;
  onSkip: () => void;
}

function DuelCardButton({
  card,
  onClick,
  disabled,
}: {
  card: DuelCard;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-mute-divider bg-surface text-left transition active:scale-[0.98] disabled:opacity-50"
    >
      <InitialThumb
        src={card.imageUrl}
        title={card.title}
        className="relative h-28 w-full"
        initialClassName="text-2xl"
        imgClassName="transition group-hover:scale-105"
      />
      <span className="line-clamp-2 px-3 py-2.5 text-sm font-medium text-ink">
        {card.title}
      </span>
    </button>
  );
}

export default function ComparisonDuel({
  subject,
  opponent,
  duelNumber,
  maxDuels,
  submitting,
  onPick,
  onSkip,
}: Props) {
  return (
    <>
      <div className="px-5 pt-2 pb-3 text-center">
        <h2 className="text-base font-semibold text-ink">Which was better?</h2>
        <p className="mt-0.5 text-xs text-mute">
          Placing it in your rankings
        </p>
      </div>

      <div className="flex items-stretch gap-3 px-5">
        <DuelCardButton
          card={subject}
          disabled={submitting}
          onClick={() => onPick("WON")}
        />
        <span className="self-center text-xs font-semibold uppercase text-mute">
          vs
        </span>
        <DuelCardButton
          card={opponent}
          disabled={submitting}
          onClick={() => onPick("LOST")}
        />
      </div>

      <div className="px-5 pb-1 pt-3 text-center">
        <button
          type="button"
          disabled={submitting}
          onClick={onSkip}
          className="text-xs font-medium text-mute underline-offset-2 hover:underline disabled:opacity-50"
        >
          Too close to call
        </button>
      </div>

      <div className="flex justify-center gap-1.5 pb-2 pt-1">
        {Array.from({ length: maxDuels }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i < duelNumber ? "bg-coral" : "bg-mute-divider"
            }`}
          />
        ))}
      </div>
    </>
  );
}
