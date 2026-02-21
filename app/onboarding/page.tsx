"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Category, DenverTenure, RelationshipStatus } from "@prisma/client";

type PreferenceLevel = "love" | "like" | "dislike" | null;
type BudgetOption = "FREE" | "UNDER_25" | "UNDER_50" | "ANY";
type SocialIntentOption = "MEET_PEOPLE" | "OWN_THING" | "EITHER";

interface CategoryPreference {
  category: Category;
  level: PreferenceLevel;
}

interface CompanionPreference {
  key: "solo" | "date" | "friends" | "family";
  intensity: number | null;
}

interface TimePreference {
  key: "weeknight" | "weekend" | "morning" | "daytime" | "evening" | "lateNight";
  intensity: number | null;
}

interface VibePreference {
  key: "chill" | "moderate" | "highEnergy";
  intensity: number | null;
}

const TOTAL_STEPS = 8;

const TENURE_OPTIONS: { value: DenverTenure; label: string; description: string }[] = [
  { value: "NEW_TO_DENVER", label: "New to Denver", description: "Just moved here!" },
  { value: "ONE_TO_TWO_YEARS", label: "1-2 years", description: "Getting to know the city" },
  { value: "TWO_TO_FIVE_YEARS", label: "2-5 years", description: "Found my favorite spots" },
  { value: "FIVE_PLUS_YEARS", label: "5+ years", description: "Denver veteran" },
];

const RELATIONSHIP_OPTIONS: { value: RelationshipStatus; label: string; icon: string }[] = [
  { value: "SINGLE", label: "Single", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { value: "COUPLE", label: "In a relationship", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
];

const CATEGORY_INFO: { category: Category; label: string; emoji: string }[] = [
  { category: "LIVE_MUSIC", label: "Live Music", emoji: "🎵" },
  { category: "ART", label: "Art & Museums", emoji: "🎨" },
  { category: "FOOD", label: "Food & Dining", emoji: "🍽️" },
  { category: "BARS", label: "Bars & Nightlife", emoji: "🍸" },
  { category: "COFFEE", label: "Coffee & Cafes", emoji: "☕" },
  { category: "OUTDOORS", label: "Outdoors & Nature", emoji: "🏔️" },
  { category: "FITNESS", label: "Fitness & Wellness", emoji: "💪" },
  { category: "SEASONAL", label: "Seasonal Events", emoji: "🎄" },
  { category: "POPUP", label: "Pop-ups & Markets", emoji: "✨" },
  { category: "OTHER", label: "Other", emoji: "🎪" },
];

const COMPANION_OPTIONS: { key: "solo" | "date" | "friends" | "family"; label: string; emoji: string; description: string }[] = [
  { key: "solo", label: "Solo", emoji: "🧘", description: "Me time, self-care" },
  { key: "date", label: "Date Night", emoji: "💕", description: "Romantic outings" },
  { key: "friends", label: "Friends", emoji: "👯", description: "Squad activities" },
  { key: "family", label: "Family", emoji: "👨‍👩‍👧‍👦", description: "Kid-friendly fun" },
];

const TIME_OPTIONS_ROW1: { key: "weeknight" | "weekend"; label: string; description: string }[] = [
  { key: "weeknight", label: "Weeknights", description: "Mon-Thu evenings" },
  { key: "weekend", label: "Weekends", description: "Fri-Sun" },
];

const TIME_OPTIONS_ROW2: { key: "morning" | "daytime" | "evening" | "lateNight"; label: string; description: string }[] = [
  { key: "morning", label: "Mornings", description: "Before 12pm" },
  { key: "daytime", label: "Daytime", description: "12pm - 5pm" },
  { key: "evening", label: "Evenings", description: "5pm - 9pm" },
  { key: "lateNight", label: "Late Night", description: "After 9pm" },
];

const BUDGET_OPTIONS: { value: BudgetOption; label: string; description: string }[] = [
  { value: "FREE", label: "Free stuff only", description: "Budget-friendly all the way" },
  { value: "UNDER_25", label: "Under $25", description: "Keep it reasonable" },
  { value: "UNDER_50", label: "Under $50", description: "Room for a nice outing" },
  { value: "ANY", label: "Money is no object", description: "Go all out" },
];

const VIBE_OPTIONS: { key: "chill" | "moderate" | "highEnergy"; label: string; emoji: string; description: string }[] = [
  { key: "chill", label: "Chill", emoji: "🧘", description: "Relaxed, low-key, easy going" },
  { key: "moderate", label: "Moderate", emoji: "⚡", description: "Fun but not crazy" },
  { key: "highEnergy", label: "High Energy", emoji: "🔥", description: "Let's go all out" },
];

const SOCIAL_OPTIONS: { value: SocialIntentOption; label: string; description: string }[] = [
  { value: "MEET_PEOPLE", label: "Yes! I want to meet people", description: "Social events, meetups" },
  { value: "OWN_THING", label: "Nah, doing my own thing", description: "Solo-friendly activities" },
  { value: "EITHER", label: "Either way", description: "Open to both" },
];

const INTENSITY_LABELS = ["Sometimes", "Often", "All the time"];

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 & 2 state (existing)
  const [denverTenure, setDenverTenure] = useState<DenverTenure | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus | null>(null);

  // Step 3: Category interests
  const [categoryPrefs, setCategoryPrefs] = useState<CategoryPreference[]>(
    CATEGORY_INFO.map((c) => ({ category: c.category, level: null }))
  );

  // Step 4: Companions
  const [companionPrefs, setCompanionPrefs] = useState<CompanionPreference[]>(
    COMPANION_OPTIONS.map((c) => ({ key: c.key, intensity: null }))
  );

  // Step 5: Timing
  const [timePrefs, setTimePrefs] = useState<TimePreference[]>([
    ...TIME_OPTIONS_ROW1.map((t) => ({ key: t.key, intensity: null })),
    ...TIME_OPTIONS_ROW2.map((t) => ({ key: t.key, intensity: null })),
  ] as TimePreference[]);

  // Step 6: Budget
  const [budget, setBudget] = useState<BudgetOption>("ANY");

  // Step 7: Vibe & Social
  const [vibePrefs, setVibePrefs] = useState<VibePreference[]>(
    VIBE_OPTIONS.map((v) => ({ key: v.key, intensity: null }))
  );
  const [socialIntent, setSocialIntent] = useState<SocialIntentOption>("EITHER");

  // Step 8: Lifestyle Preferences
  const [hasDog, setHasDog] = useState(false);
  const [dogFriendlyOnly, setDogFriendlyOnly] = useState(false);
  const [preferSoberFriendly, setPreferSoberFriendly] = useState(false);
  const [avoidBars, setAvoidBars] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (session.user.onboardingComplete) {
      router.push("/feed");
    }
  }, [session, status, router]);

  const handleCategoryChange = (category: Category, level: PreferenceLevel) => {
    setCategoryPrefs((prev) =>
      prev.map((p) => (p.category === category ? { ...p, level } : p))
    );
  };

  const handleCompanionChange = (key: string, intensity: number | null) => {
    setCompanionPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, intensity } : p))
    );
  };

  const handleTimeChange = (key: string, intensity: number | null) => {
    setTimePrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, intensity } : p))
    );
  };

  const handleVibeChange = (key: string, intensity: number | null) => {
    setVibePrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, intensity } : p))
    );
  };

  const handleSubmit = async () => {
    if (!denverTenure || !relationshipStatus) {
      setError("Please complete all required steps");
      return;
    }

    const selectedCategoryPrefs = categoryPrefs.filter((p) => p.level !== null);
    if (selectedCategoryPrefs.length === 0) {
      setError("Please select at least one interest");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save basic onboarding data
      const onboardingResponse = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          denverTenure,
          relationshipStatus,
          preferences: selectedCategoryPrefs,
        }),
      });

      if (!onboardingResponse.ok) {
        const data = await onboardingResponse.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      // Save detailed preferences
      const companionData: Record<string, number | null> = {};
      companionPrefs.forEach((p) => {
        if (p.key === "solo") companionData.goingSolo = p.intensity;
        if (p.key === "date") companionData.goingDate = p.intensity;
        if (p.key === "friends") companionData.goingFriends = p.intensity;
        if (p.key === "family") companionData.goingFamily = p.intensity;
      });

      const timeData: Record<string, number | null> = {};
      timePrefs.forEach((p) => {
        if (p.key === "weeknight") timeData.timeWeeknight = p.intensity;
        if (p.key === "weekend") timeData.timeWeekend = p.intensity;
        if (p.key === "morning") timeData.timeMorning = p.intensity;
        if (p.key === "daytime") timeData.timeDaytime = p.intensity;
        if (p.key === "evening") timeData.timeEvening = p.intensity;
        if (p.key === "lateNight") timeData.timeLateNight = p.intensity;
      });

      const vibeData: Record<string, number | null> = {};
      vibePrefs.forEach((p) => {
        if (p.key === "chill") vibeData.vibeChill = p.intensity;
        if (p.key === "moderate") vibeData.vibeModerate = p.intensity;
        if (p.key === "highEnergy") vibeData.vibeHighEnergy = p.intensity;
      });

      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...companionData,
          ...timeData,
          budget,
          ...vibeData,
          socialIntent,
          // Lifestyle preferences
          hasDog,
          dogFriendlyOnly,
          preferSoberFriendly,
          avoidBars,
        }),
      });

      await update();
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return denverTenure !== null;
    if (step === 2) return relationshipStatus !== null;
    if (step === 3) return categoryPrefs.some((p) => p.level !== null);
    // Steps 4-7 are optional (can skip)
    return true;
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || session.user.onboardingComplete) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-sm text-slate-500">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step 1: Denver Tenure */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome to Pulse!
            </h1>
            <p className="mt-2 text-slate-600">
              How long have you lived in Denver?
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TENURE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDenverTenure(option.value)}
                className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${
                  denverTenure === option.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-900">{option.label}</div>
                <div className="text-sm text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Relationship Status */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Going solo or with a partner?
            </h1>
            <p className="mt-2 text-slate-600">
              This helps us recommend the right events for you
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {RELATIONSHIP_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRelationshipStatus(option.value)}
                className={`rounded-xl border-2 p-6 text-center transition hover:shadow-md ${
                  relationshipStatus === option.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                  </svg>
                </div>
                <div className="font-semibold text-slate-900">{option.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Interests */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              What are you into?
            </h1>
            <p className="mt-2 text-slate-600">
              Tell us how you feel about these categories
            </p>
          </div>

          <div className="space-y-3">
            {CATEGORY_INFO.map((cat) => {
              const pref = categoryPrefs.find((p) => p.category === cat.category);
              return (
                <div
                  key={cat.category}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="font-medium text-slate-900">{cat.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCategoryChange(cat.category, "love")}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        pref?.level === "love"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Love it
                    </button>
                    <button
                      onClick={() => handleCategoryChange(cat.category, "like")}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        pref?.level === "like"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Like it
                    </button>
                    <button
                      onClick={() => handleCategoryChange(cat.category, "dislike")}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        pref?.level === "dislike"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Not for me
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Companions */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Who do you usually explore Denver with?
            </h1>
            <p className="mt-2 text-slate-600">
              Select all that apply and how often
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {COMPANION_OPTIONS.map((option) => {
              const pref = companionPrefs.find((p) => p.key === option.key);
              const isSelected = pref?.intensity !== null;
              return (
                <div
                  key={option.key}
                  className={`rounded-xl border-2 p-4 transition ${
                    isSelected ? "border-primary bg-primary/5" : "border-slate-200"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <div>
                      <div className="font-semibold text-slate-900">{option.label}</div>
                      <div className="text-sm text-slate-500">{option.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[2, 4, 5].map((intensity, i) => (
                      <button
                        key={intensity}
                        onClick={() => handleCompanionChange(option.key, pref?.intensity === intensity ? null : intensity)}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                          pref?.intensity === intensity
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {INTENSITY_LABELS[i]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-slate-400">
            This step is optional - skip if you prefer
          </p>
        </div>
      )}

      {/* Step 5: Timing */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              When are you usually free?
            </h1>
            <p className="mt-2 text-slate-600">
              Select your preferred times
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {TIME_OPTIONS_ROW1.map((option) => {
                const pref = timePrefs.find((p) => p.key === option.key);
                const isSelected = pref?.intensity !== null;
                return (
                  <div
                    key={option.key}
                    className={`rounded-xl border-2 p-4 transition ${
                      isSelected ? "border-primary bg-primary/5" : "border-slate-200"
                    }`}
                  >
                    <div className="mb-2">
                      <div className="font-semibold text-slate-900">{option.label}</div>
                      <div className="text-sm text-slate-500">{option.description}</div>
                    </div>
                    <div className="flex gap-1">
                      {[2, 4, 5].map((intensity, i) => (
                        <button
                          key={intensity}
                          onClick={() => handleTimeChange(option.key, pref?.intensity === intensity ? null : intensity)}
                          className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                            pref?.intensity === intensity
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {INTENSITY_LABELS[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TIME_OPTIONS_ROW2.map((option) => {
                const pref = timePrefs.find((p) => p.key === option.key);
                const isSelected = pref?.intensity !== null;
                return (
                  <div
                    key={option.key}
                    className={`rounded-xl border-2 p-3 transition ${
                      isSelected ? "border-primary bg-primary/5" : "border-slate-200"
                    }`}
                  >
                    <div className="mb-2 text-center">
                      <div className="font-semibold text-slate-900 text-sm">{option.label}</div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {[2, 4, 5].map((intensity, i) => (
                        <button
                          key={intensity}
                          onClick={() => handleTimeChange(option.key, pref?.intensity === intensity ? null : intensity)}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                            pref?.intensity === intensity
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {INTENSITY_LABELS[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-sm text-slate-400">
            This step is optional - skip if you prefer
          </p>
        </div>
      )}

      {/* Step 6: Budget */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              What&apos;s your typical budget for an outing?
            </h1>
            <p className="mt-2 text-slate-600">
              We&apos;ll show you events that fit your wallet
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BUDGET_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setBudget(option.value)}
                className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${
                  budget === option.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="font-semibold text-slate-900">{option.label}</div>
                <div className="text-sm text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 7: Vibe & Social */}
      {step === 7 && (
        <div className="space-y-8">
          {/* Vibe Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                What energy are you usually looking for?
              </h1>
              <p className="mt-2 text-slate-600">
                Select your preferred vibes
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {VIBE_OPTIONS.map((option) => {
                const pref = vibePrefs.find((p) => p.key === option.key);
                const isSelected = pref?.intensity !== null;
                return (
                  <div
                    key={option.key}
                    className={`rounded-xl border-2 p-4 text-center transition ${
                      isSelected ? "border-primary bg-primary/5" : "border-slate-200"
                    }`}
                  >
                    <div className="mb-3 text-3xl">{option.emoji}</div>
                    <div className="font-semibold text-slate-900">{option.label}</div>
                    <div className="mb-3 text-sm text-slate-500">{option.description}</div>
                    <div className="flex gap-1">
                      {[2, 4, 5].map((intensity, i) => (
                        <button
                          key={intensity}
                          onClick={() => handleVibeChange(option.key, pref?.intensity === intensity ? null : intensity)}
                          className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                            pref?.intensity === intensity
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {INTENSITY_LABELS[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                Are you looking to meet new people?
              </h2>
            </div>

            <div className="space-y-2">
              {SOCIAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSocialIntent(option.value)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ${
                    socialIntent === option.value
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900">{option.label}</div>
                  <div className="text-sm text-slate-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 8: Lifestyle Preferences */}
      {step === 8 && (
        <div className="space-y-8">
          {/* Dog-Friendly Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                Do you have a furry friend?
              </h1>
              <p className="mt-2 text-slate-600">
                We&apos;ll help you find dog-friendly spots
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setHasDog(!hasDog);
                  if (hasDog) setDogFriendlyOnly(false);
                }}
                className={`w-full rounded-xl border-2 p-4 text-left transition ${
                  hasDog
                    ? "border-amber-500 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐕</span>
                  <div>
                    <div className="font-semibold text-slate-900">I have a dog</div>
                    <div className="text-sm text-slate-500">Show me pup-friendly options</div>
                  </div>
                </div>
              </button>

              {hasDog && (
                <button
                  onClick={() => setDogFriendlyOnly(!dogFriendlyOnly)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ml-4 ${
                    dogFriendlyOnly
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                      <div className="font-semibold text-slate-900">Only show dog-friendly places</div>
                      <div className="text-sm text-slate-500">Filter out places where dogs aren&apos;t welcome</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Sober-Friendly Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                Drinking preferences
              </h2>
              <p className="mt-2 text-slate-600">
                Find events that match your lifestyle
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setPreferSoberFriendly(!preferSoberFriendly)}
                className={`w-full rounded-xl border-2 p-4 text-left transition ${
                  preferSoberFriendly
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍹</span>
                  <div>
                    <div className="font-semibold text-slate-900">I prefer sober-friendly options</div>
                    <div className="text-sm text-slate-500">Prioritize events that are great without drinking</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setAvoidBars(!avoidBars)}
                className={`w-full rounded-xl border-2 p-4 text-left transition ${
                  avoidBars
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚫</span>
                  <div>
                    <div className="font-semibold text-slate-900">Avoid bar-centric venues</div>
                    <div className="text-sm text-slate-500">Skip places where drinking is the main activity</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-400">
            This step is optional - skip if you prefer
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          {step > 3 && step < TOTAL_STEPS && (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Skip
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Start exploring"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
