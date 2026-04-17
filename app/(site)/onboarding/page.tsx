"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWelcomeContent } from "@/lib/onboarding/welcome-content";
import {
  INITIAL_STATE,
  TOTAL_STEPS,
  type OnboardingState,
  type VibeSelection,
} from "@/lib/onboarding/types";
import type {
  ContextSegment,
  SocialStyleType,
  PlanningStyle,
  BudgetTier,
} from "@prisma/client";

// ─── Progress Dots ───────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-primary"
              : i < current
              ? "w-2 bg-primary/40"
              : "w-2 bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Option Card (auto-advance on select) ────────────────────────────────────

interface OptionCardProps {
  emoji: string;
  label: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}

function OptionCard({
  emoji,
  label,
  subtitle,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Vibe Pair Card ──────────────────────────────────────────────────────────

interface VibePairCardProps {
  pair: number;
  optionA: { emoji: string; label: string };
  optionB: { emoji: string; label: string };
  selected: VibeSelection | null;
  onSelect: (pair: number, selection: VibeSelection) => void;
}

function VibePairCard({
  pair,
  optionA,
  optionB,
  selected,
  onSelect,
}: VibePairCardProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onSelect(pair, "A")}
        className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-200 ${
          selected === "A"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <span className="text-2xl">{optionA.emoji}</span>
        <p className="mt-2 text-center text-sm font-medium text-slate-900">
          {optionA.label}
        </p>
      </button>
      <button
        onClick={() => onSelect(pair, "B")}
        className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-200 ${
          selected === "B"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <span className="text-2xl">{optionB.emoji}</span>
        <p className="mt-2 text-center text-sm font-medium text-slate-900">
          {optionB.label}
        </p>
      </button>
    </div>
  );
}

// ─── Screen Wrapper ──────────────────────────────────────────────────────────

function ScreenWrapper({
  children,
  header,
  subtext,
}: {
  children: React.ReactNode;
  header: string;
  subtext?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {header}
        </h1>
        {subtext && <p className="text-slate-500">{subtext}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Discovery Card (welcome screen) ─────────────────────────────────────────

function DiscoveryCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Redirect if not logged in or already onboarded
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }
    if (session.user.onboardingComplete) {
      router.replace("/feed");
    }
  }, [session, status, router]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const advance = useCallback(() => {
    setStep((s) => s + 1);
  }, []);

  // Auto-advance with delay after selection
  const autoAdvance = useCallback(() => {
    setTimeout(() => advance(), 400);
  }, [advance]);

  const submitOnboarding = useCallback(async () => {
    if (isSubmitting || submitted) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextSegment: state.contextSegment,
          socialStyle: state.socialStyle,
          vibePreferences: state.vibePreferences,
          planningStyle: state.planningStyle,
          budgetTier: state.budgetTier,
          sparkResponse: state.sparkResponse || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSubmitted(true);
      await update();
    } catch (err) {
      console.error("Onboarding save error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [state, isSubmitting, submitted, update]);

  // Submit when reaching welcome screen
  useEffect(() => {
    if (step >= TOTAL_STEPS && !submitted && !isSubmitting && state.contextSegment) {
      submitOnboarding();
    }
  }, [step, submitted, isSubmitting, state.contextSegment, submitOnboarding]);

  // ─── Handlers ────────────────────────────────────────────────────────

  const selectContext = (value: ContextSegment) => {
    setState((s) => ({ ...s, contextSegment: value }));
    autoAdvance();
  };

  const selectSocial = (value: SocialStyleType) => {
    setState((s) => ({ ...s, socialStyle: value }));
    autoAdvance();
  };

  const selectVibe = (pair: number, selected: VibeSelection) => {
    setState((s) => {
      const existing = s.vibePreferences.filter((v) => v.pair !== pair);
      return { ...s, vibePreferences: [...existing, { pair, selected }] };
    });
  };

  const selectPlanning = (value: PlanningStyle) => {
    setState((s) => ({ ...s, planningStyle: value }));
    autoAdvance();
  };

  const selectBudget = (value: BudgetTier) => {
    setState((s) => ({ ...s, budgetTier: value }));
    autoAdvance();
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ─── Welcome Screen (after all questions) ───────────────────────────

  if (step >= TOTAL_STEPS) {
    const welcome = state.contextSegment
      ? getWelcomeContent(state.contextSegment)
      : null;

    return (
      <div className="mx-auto max-w-lg space-y-8 px-4 py-12">
        <div className="space-y-2 text-center">
          <p className="text-3xl">🎉</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            You&apos;re all set
          </h1>
          {welcome && (
            <p className="text-slate-500">{welcome.headline}</p>
          )}
        </div>

        {welcome && (
          <div className="space-y-3">
            {welcome.cards.map((card, i) => (
              <DiscoveryCard key={i} {...card} />
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/feed")}
          disabled={isSubmitting}
          className="btn-primary w-full py-3 text-base disabled:opacity-50"
        >
          {isSubmitting ? "Setting things up..." : "Let's go"}
        </button>
      </div>
    );
  }

  // ─── Question Screens ───────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header: back arrow + progress dots */}
      <div className="mb-6 flex items-center">
        {step > 0 ? (
          <button
            onClick={goBack}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1">
          <ProgressDots current={step} total={TOTAL_STEPS} />
        </div>
        <div className="w-9" />
      </div>

      {/* Step 0: Context Segment */}
      {step === 0 && (
        <ScreenWrapper
          header="Let's get you set up"
          subtext="This takes about 60 seconds and makes everything better."
        >
          <p className="font-medium text-slate-700">
            What best describes you right now?
          </p>
          <div className="space-y-3">
            <OptionCard
              emoji="🌱"
              label="I'm new to Denver"
              subtitle="Still figuring out what's out here"
              selected={state.contextSegment === "NEW_TO_CITY"}
              onSelect={() => selectContext("NEW_TO_CITY")}
            />
            <OptionCard
              emoji="🔄"
              label="I'm in a rut"
              subtitle="Been here a while, need something new"
              selected={state.contextSegment === "IN_A_RUT"}
              onSelect={() => selectContext("IN_A_RUT")}
            />
            <OptionCard
              emoji="🔍"
              label="Show me what I'm missing"
              subtitle="I know my city — go deeper"
              selected={state.contextSegment === "LOCAL_EXPLORER"}
              onSelect={() => selectContext("LOCAL_EXPLORER")}
            />
            <OptionCard
              emoji="✈️"
              label="I'm visiting"
              subtitle="Here for a few days, make them count"
              selected={state.contextSegment === "VISITING"}
              onSelect={() => selectContext("VISITING")}
            />
          </div>
        </ScreenWrapper>
      )}

      {/* Step 1: Social Style */}
      {step === 1 && (
        <ScreenWrapper header="When you find something cool to do...">
          <p className="font-medium text-slate-700">What usually happens?</p>
          <div className="space-y-3">
            <OptionCard
              emoji="👥"
              label="I grab someone and go"
              subtitle="Always better with people"
              selected={state.socialStyle === "SOCIAL_CONNECTOR"}
              onSelect={() => selectSocial("SOCIAL_CONNECTOR")}
            />
            <OptionCard
              emoji="📌"
              label="I save it for later"
              subtitle="...and hope I actually go"
              selected={state.socialStyle === "PASSIVE_SAVER"}
              onSelect={() => selectSocial("PASSIVE_SAVER")}
            />
            <OptionCard
              emoji="🚶"
              label="I just go"
              subtitle="Don't need anyone to do cool stuff"
              selected={state.socialStyle === "SOLO_EXPLORER"}
              onSelect={() => selectSocial("SOLO_EXPLORER")}
            />
            <OptionCard
              emoji="📲"
              label="I send it to my person"
              subtitle="Partner, bestie — they need to see this"
              selected={state.socialStyle === "DIRECT_SHARER"}
              onSelect={() => selectSocial("DIRECT_SHARER")}
            />
          </div>
        </ScreenWrapper>
      )}

      {/* Step 2: Vibe Tradeoffs */}
      {step === 2 && (
        <ScreenWrapper
          header="Quick — pick the one that calls to you"
          subtext="No wrong answers. Go with your gut."
        >
          <div className="space-y-4">
            <VibePairCard
              pair={1}
              optionA={{ emoji: "🍸", label: "Rooftop cocktails" }}
              optionB={{ emoji: "🎸", label: "Dive bar with a jukebox" }}
              selected={
                state.vibePreferences.find((v) => v.pair === 1)?.selected ??
                null
              }
              onSelect={selectVibe}
            />
            <VibePairCard
              pair={2}
              optionA={{ emoji: "🥾", label: "Guided group hike" }}
              optionB={{ emoji: "🗺️", label: "Hidden trail nobody knows" }}
              selected={
                state.vibePreferences.find((v) => v.pair === 2)?.selected ??
                null
              }
              onSelect={selectVibe}
            />
            <VibePairCard
              pair={3}
              optionA={{ emoji: "🎷", label: "Live jazz on a Friday" }}
              optionB={{ emoji: "🎧", label: "Underground electronic show" }}
              selected={
                state.vibePreferences.find((v) => v.pair === 3)?.selected ??
                null
              }
              onSelect={selectVibe}
            />
            <VibePairCard
              pair={4}
              optionA={{ emoji: "🌽", label: "Farmers market morning" }}
              optionB={{ emoji: "🌮", label: "Late-night food truck rally" }}
              selected={
                state.vibePreferences.find((v) => v.pair === 4)?.selected ??
                null
              }
              onSelect={selectVibe}
            />
          </div>
          {state.vibePreferences.length === 4 && (
            <button onClick={advance} className="btn-primary mt-6 w-full py-3">
              Continue
            </button>
          )}
        </ScreenWrapper>
      )}

      {/* Step 3: Planning Style */}
      {step === 3 && (
        <ScreenWrapper header="How far ahead do you plan?">
          <div className="space-y-3">
            <OptionCard
              emoji="⚡"
              label="What are we doing tonight?"
              subtitle="I decide in the moment"
              selected={state.planningStyle === "SPONTANEOUS"}
              onSelect={() => selectPlanning("SPONTANEOUS")}
            />
            <OptionCard
              emoji="📅"
              label="Weekend figured out by Thursday"
              subtitle="I like to have a plan"
              selected={state.planningStyle === "WEEKEND_PLANNER"}
              onSelect={() => selectPlanning("WEEKEND_PLANNER")}
            />
            <OptionCard
              emoji="🗓️"
              label="Book me two weeks out"
              subtitle="Calendar person through and through"
              selected={state.planningStyle === "ADVANCE_PLANNER"}
              onSelect={() => selectPlanning("ADVANCE_PLANNER")}
            />
          </div>
        </ScreenWrapper>
      )}

      {/* Step 4: Budget */}
      {step === 4 && (
        <ScreenWrapper
          header="Let's talk money"
          subtext="So we only show you stuff that makes sense."
        >
          <div className="space-y-3">
            <OptionCard
              emoji="🆓"
              label="Keep it free (or close to it)"
              subtitle="Best things in life, right?"
              selected={state.budgetTier === "FREE_FOCUSED"}
              onSelect={() => selectBudget("FREE_FOCUSED")}
            />
            <OptionCard
              emoji="💵"
              label="I'll spend a little"
              subtitle="If it's worth it, I'm in"
              selected={state.budgetTier === "MODERATE"}
              onSelect={() => selectBudget("MODERATE")}
            />
            <OptionCard
              emoji="✨"
              label="Treat yourself"
              subtitle="I'm here for a good time"
              selected={state.budgetTier === "TREAT_YOURSELF"}
              onSelect={() => selectBudget("TREAT_YOURSELF")}
            />
          </div>
        </ScreenWrapper>
      )}

      {/* Step 5: Spark */}
      {step === 5 && (
        <ScreenWrapper header="One more thing">
          <p className="font-medium text-slate-700">
            What&apos;s the best thing you&apos;ve done in a city — any city —
            in the last year?
          </p>
          <p className="text-sm text-slate-500">
            A concert, a hike, a random Tuesday adventure — whatever made you
            feel most alive.
          </p>
          <textarea
            value={state.sparkResponse}
            onChange={(e) =>
              setState((s) => ({ ...s, sparkResponse: e.target.value }))
            }
            placeholder='e.g., "Stumbled into a jazz club in New Orleans at midnight"'
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={advance} className="btn-primary w-full py-3">
            Continue
          </button>
          <button
            onClick={advance}
            className="w-full py-2 text-center text-sm text-slate-400 transition hover:text-slate-600"
          >
            Skip
          </button>
        </ScreenWrapper>
      )}
    </div>
  );
}
