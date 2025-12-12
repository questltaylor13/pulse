"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type GoingWith = "SOLO" | "DATE" | "FRIENDS" | "FAMILY";
type PlanType = "DATE_NIGHT" | "SOCIAL" | "SOLO_CHILL" | "FAMILY_FUN" | "CUSTOM";
type Category = "ART" | "LIVE_MUSIC" | "BARS" | "FOOD" | "COFFEE" | "OUTDOORS" | "FITNESS" | "SEASONAL" | "POPUP" | "OTHER" | "RESTAURANT" | "ACTIVITY_VENUE";

interface PlanEvent {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  neighborhood: string | null;
  startTime: string;
  priceRange: string;
  order: number;
}

interface Plan {
  id: string;
  name: string;
  planType: PlanType;
  goingWith: GoingWith;
  dateStart: string;
  dateEnd: string;
  totalCost: string | null;
  neighborhoods: string[];
  isPublic: boolean;
  events: PlanEvent[];
  createdAt: string;
}

interface GeneratedPlan {
  name: string;
  description: string;
  planType: PlanType;
  events: PlanEvent[];
  totalCost: string;
  neighborhoods: string[];
}

const GOING_WITH_OPTIONS: { value: GoingWith; label: string; icon: string }[] = [
  { value: "SOLO", label: "Solo", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { value: "DATE", label: "Date", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "FRIENDS", label: "Friends", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "FAMILY", label: "Family", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
];

const PLAN_TYPE_COLORS: Record<PlanType, string> = {
  DATE_NIGHT: "bg-pink-100 text-pink-700",
  SOCIAL: "bg-purple-100 text-purple-700",
  SOLO_CHILL: "bg-blue-100 text-blue-700",
  FAMILY_FUN: "bg-green-100 text-green-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  DATE_NIGHT: "Date Night",
  SOCIAL: "Social",
  SOLO_CHILL: "Solo Chill",
  FAMILY_FUN: "Family Fun",
  CUSTOM: "Custom",
};

const CATEGORY_EMOJI: Record<Category, string> = {
  ART: "🎨",
  LIVE_MUSIC: "🎵",
  BARS: "🍸",
  FOOD: "🍽️",
  COFFEE: "☕",
  OUTDOORS: "🏔️",
  FITNESS: "💪",
  SEASONAL: "🎄",
  POPUP: "✨",
  OTHER: "🎪",
  RESTAURANT: "🍴",
  ACTIVITY_VENUE: "🎯",
};

export default function PlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPlans, setGeneratedPlans] = useState<GeneratedPlan[]>([]);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  // Builder form state
  const [goingWith, setGoingWith] = useState<GoingWith>("FRIENDS");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchPlans();

    // Set default dates to this weekend
    const today = new Date();
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - today.getDay()));
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    setDateStart(saturday.toISOString().split("T")[0]);
    setDateEnd(sunday.toISOString().split("T")[0]);
  }, [session, status, router]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlans = async () => {
    if (!dateStart || !dateEnd) return;

    setGenerating(true);
    setGeneratedPlans([]);

    try {
      const response = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goingWith,
          dateStart: new Date(dateStart).toISOString(),
          dateEnd: new Date(dateEnd + "T23:59:59").toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Failed to generate plans:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = async (plan: GeneratedPlan) => {
    setSavingPlan(plan.name);

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          planType: plan.planType,
          goingWith,
          dateStart: new Date(dateStart).toISOString(),
          dateEnd: new Date(dateEnd + "T23:59:59").toISOString(),
          eventIds: plan.events.map((e) => e.id),
        }),
      });

      if (response.ok) {
        await fetchPlans();
        setShowBuilder(false);
        setGeneratedPlans([]);
      }
    } catch (err) {
      console.error("Failed to save plan:", err);
    } finally {
      setSavingPlan(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Plans</h1>
          <p className="text-slate-600">Build and manage your Denver adventures</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Build My Weekend
        </button>
      </div>

      {/* Plan Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Build Your Plan</h2>
              <button
                onClick={() => {
                  setShowBuilder(false);
                  setGeneratedPlans([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {generatedPlans.length === 0 ? (
              <>
                {/* Going With Selection */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Who are you going with?
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {GOING_WITH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setGoingWith(option.value)}
                        className={`flex flex-col items-center rounded-lg p-4 transition ${
                          goingWith === option.value
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <svg className="mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                        </svg>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      min={dateStart}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGeneratePlans}
                  disabled={generating || !dateStart || !dateEnd}
                  className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Plans...
                    </span>
                  ) : (
                    "Generate Plan Options"
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Generated Plans */}
                <p className="mb-4 text-sm text-slate-600">
                  Here are some plan options for your {formatDate(dateStart)}
                  {dateStart !== dateEnd && ` - ${formatDate(dateEnd)}`} outing:
                </p>

                <div className="space-y-4">
                  {generatedPlans.map((plan, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{plan.name}</h3>
                          <p className="text-sm text-slate-600">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${PLAN_TYPE_COLORS[plan.planType]}`}>
                            {PLAN_TYPE_LABELS[plan.planType]}
                          </span>
                          <div className="mt-1 text-sm font-medium text-slate-700">
                            {plan.totalCost}
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="mb-4 space-y-3">
                        {plan.events.map((event, eventIndex) => (
                          <div key={event.id} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                              {CATEGORY_EMOJI[event.category] || "📍"}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-slate-500">
                                {event.venueName}
                                {event.neighborhood && ` • ${event.neighborhood}`}
                              </div>
                              <div className="text-sm text-slate-400">
                                {formatTime(event.startTime)} • {event.priceRange}
                              </div>
                            </div>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {eventIndex + 1}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Neighborhoods */}
                      {plan.neighborhoods.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1">
                          {plan.neighborhoods.map((n) => (
                            <span
                              key={n}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => handleSavePlan(plan)}
                        disabled={savingPlan === plan.name}
                        className="w-full rounded-lg border border-primary py-2 font-medium text-primary transition hover:bg-primary hover:text-white disabled:opacity-50"
                      >
                        {savingPlan === plan.name ? "Saving..." : "Save This Plan"}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setGeneratedPlans([])}
                  className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  Start Over
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Existing Plans */}
      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mb-2 text-lg font-semibold text-slate-700">No plans yet</h3>
          <p className="mb-4 text-slate-500">
            Build your first Denver adventure plan!
          </p>
          <button
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Build My Weekend
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-sm text-slate-500">
                    {formatDate(plan.dateStart)}
                    {plan.dateStart !== plan.dateEnd && ` - ${formatDate(plan.dateEnd)}`}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${PLAN_TYPE_COLORS[plan.planType]}`}>
                  {PLAN_TYPE_LABELS[plan.planType]}
                </span>
              </div>

              <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={GOING_WITH_OPTIONS.find((o) => o.value === plan.goingWith)?.icon || ""} />
                </svg>
                <span>{GOING_WITH_OPTIONS.find((o) => o.value === plan.goingWith)?.label}</span>
                {plan.totalCost && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{plan.totalCost}</span>
                  </>
                )}
              </div>

              <div className="mb-3 space-y-2">
                {plan.events.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{CATEGORY_EMOJI[event.category] || "📍"}</span>
                    <span className="truncate text-slate-700">{event.title}</span>
                  </div>
                ))}
                {plan.events.length > 3 && (
                  <div className="text-sm text-slate-500">
                    +{plan.events.length - 3} more
                  </div>
                )}
              </div>

              {plan.neighborhoods.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {plan.neighborhoods.slice(0, 3).map((n) => (
                    <span
                      key={n}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
