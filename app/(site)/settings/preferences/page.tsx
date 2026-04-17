"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
type TimeOfDay = "MORNING" | "AFTERNOON" | "EVENING" | "LATE_NIGHT";
type BudgetPreference = "FREE" | "UNDER_25" | "UNDER_50" | "UNDER_100" | "ANY";
type SocialIntent = "MEET_PEOPLE" | "OWN_THING" | "EITHER";

interface UserConstraints {
  preferredDays: DayOfWeek[];
  preferredTimes: TimeOfDay[];
  budgetMax: BudgetPreference;
  neighborhoods: string[];
  homeNeighborhood: string | null;
  freeEventsOnly: boolean;
  discoveryMode: boolean;
  travelRadius: number | null;
}

interface DetailedPreferences {
  goingSolo: number | null;
  goingDate: number | null;
  goingFriends: number | null;
  goingFamily: number | null;
  timeWeeknight: number | null;
  timeWeekend: number | null;
  timeMorning: number | null;
  timeDaytime: number | null;
  timeEvening: number | null;
  timeLateNight: number | null;
  budget: BudgetPreference;
  vibeChill: number | null;
  vibeModerate: number | null;
  vibeHighEnergy: number | null;
  socialIntent: SocialIntent;
}

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: "MONDAY", label: "Monday", short: "Mon" },
  { value: "TUESDAY", label: "Tuesday", short: "Tue" },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { value: "THURSDAY", label: "Thursday", short: "Thu" },
  { value: "FRIDAY", label: "Friday", short: "Fri" },
  { value: "SATURDAY", label: "Saturday", short: "Sat" },
  { value: "SUNDAY", label: "Sunday", short: "Sun" },
];

const TIMES: { value: TimeOfDay; label: string; description: string }[] = [
  { value: "MORNING", label: "Morning", description: "6am - 12pm" },
  { value: "AFTERNOON", label: "Afternoon", description: "12pm - 5pm" },
  { value: "EVENING", label: "Evening", description: "5pm - 9pm" },
  { value: "LATE_NIGHT", label: "Late Night", description: "9pm+" },
];

const BUDGETS: { value: BudgetPreference; label: string }[] = [
  { value: "FREE", label: "Free only" },
  { value: "UNDER_25", label: "Under $25" },
  { value: "UNDER_50", label: "Under $50" },
  { value: "UNDER_100", label: "Under $100" },
  { value: "ANY", label: "Any budget" },
];

const DENVER_NEIGHBORHOODS = [
  "LoDo", "RiNo", "LoHi", "Highlands", "Capitol Hill", "Cherry Creek",
  "Wash Park", "Baker", "Five Points", "Uptown", "City Park", "Sloan's Lake",
  "Berkeley", "Tennyson", "SoBo", "Golden Triangle", "Ballpark", "Curtis Park",
];

const COMPANION_OPTIONS = [
  { key: "goingSolo" as const, label: "Solo", emoji: "🧘", description: "Me time, self-care activities" },
  { key: "goingDate" as const, label: "Date Night", emoji: "💕", description: "Romantic outings for two" },
  { key: "goingFriends" as const, label: "Friends", emoji: "👯", description: "Group hangouts and social events" },
  { key: "goingFamily" as const, label: "Family", emoji: "👨‍👩‍👧‍👦", description: "Kid-friendly and all-ages" },
];

const VIBE_OPTIONS = [
  { key: "vibeChill" as const, label: "Chill", emoji: "😌", description: "Relaxed, low-key vibes" },
  { key: "vibeModerate" as const, label: "Social", emoji: "🎉", description: "Fun and social energy" },
  { key: "vibeHighEnergy" as const, label: "High Energy", emoji: "🔥", description: "Dancing, concerts, adventures" },
];

const SOCIAL_OPTIONS: { value: SocialIntent; label: string; description: string }[] = [
  { value: "MEET_PEOPLE", label: "Meet new people", description: "Open to making new connections" },
  { value: "OWN_THING", label: "Do my own thing", description: "Prefer familiar faces or solo" },
  { value: "EITHER", label: "Either way", description: "Flexible depending on the vibe" },
];

const INTENSITY_LABELS = ["Never", "Sometimes", "Often", "Usually", "Always"];

function IntensitySelector({
  value,
  onChange,
  label,
  emoji,
  description,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  emoji: string;
  description: string;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="font-medium text-slate-900">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onChange(value === level ? null : level)}
            onMouseEnter={() => setHoverValue(level)}
            onMouseLeave={() => setHoverValue(null)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              value && value >= level
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="mt-2 h-4 text-center text-xs text-slate-500">
        {(hoverValue || value) ? INTENSITY_LABELS[(hoverValue || value || 1) - 1] : "Tap to set preference"}
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personality" | "schedule">("personality");

  const [constraints, setConstraints] = useState<UserConstraints>({
    preferredDays: [],
    preferredTimes: [],
    budgetMax: "ANY",
    neighborhoods: [],
    homeNeighborhood: null,
    freeEventsOnly: false,
    discoveryMode: false,
    travelRadius: null,
  });

  const [detailedPrefs, setDetailedPrefs] = useState<DetailedPreferences>({
    goingSolo: null,
    goingDate: null,
    goingFriends: null,
    goingFamily: null,
    timeWeeknight: null,
    timeWeekend: null,
    timeMorning: null,
    timeDaytime: null,
    timeEvening: null,
    timeLateNight: null,
    budget: "ANY",
    vibeChill: null,
    vibeModerate: null,
    vibeHighEnergy: null,
    socialIntent: "EITHER",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [constraintsRes, prefsRes] = await Promise.all([
        fetch("/api/constraints"),
        fetch("/api/preferences"),
      ]);

      if (constraintsRes.ok) {
        const data = await constraintsRes.json();
        if (data.constraints) {
          setConstraints(data.constraints);
        }
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data.preferences) {
          setDetailedPrefs(data.preferences);
        }
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const [constraintsRes, prefsRes] = await Promise.all([
        fetch("/api/constraints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(constraints),
        }),
        fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailedPrefs),
        }),
      ]);

      if (!constraintsRes.ok || !prefsRes.ok) {
        throw new Error("Failed to save preferences");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setConstraints((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const toggleTime = (time: TimeOfDay) => {
    setConstraints((prev) => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(time)
        ? prev.preferredTimes.filter((t) => t !== time)
        : [...prev.preferredTimes, time],
    }));
  };

  const toggleNeighborhood = (neighborhood: string) => {
    setConstraints((prev) => ({
      ...prev,
      neighborhoods: prev.neighborhoods.includes(neighborhood)
        ? prev.neighborhoods.filter((n) => n !== neighborhood)
        : [...prev.neighborhoods, neighborhood],
    }));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/feed"
          className="text-slate-500 hover:text-slate-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Preferences</h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("personality")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
            activeTab === "personality"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Your Style
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
            activeTab === "schedule"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Schedule & Location
        </button>
      </div>

      {activeTab === "personality" && (
        <div className="space-y-8">
          {/* Who You Go With */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Who do you go out with?</h2>
            <p className="mb-4 text-sm text-slate-500">
              Rate how often you explore the city in each scenario (1 = rarely, 5 = always)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMPANION_OPTIONS.map((option) => (
                <IntensitySelector
                  key={option.key}
                  value={detailedPrefs[option.key]}
                  onChange={(value) => setDetailedPrefs((prev) => ({ ...prev, [option.key]: value }))}
                  label={option.label}
                  emoji={option.emoji}
                  description={option.description}
                />
              ))}
            </div>
          </section>

          {/* Your Vibe */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">What&apos;s your vibe?</h2>
            <p className="mb-4 text-sm text-slate-500">
              What energy levels do you enjoy? (1 = rarely, 5 = always)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {VIBE_OPTIONS.map((option) => (
                <IntensitySelector
                  key={option.key}
                  value={detailedPrefs[option.key]}
                  onChange={(value) => setDetailedPrefs((prev) => ({ ...prev, [option.key]: value }))}
                  label={option.label}
                  emoji={option.emoji}
                  description={option.description}
                />
              ))}
            </div>
          </section>

          {/* Social Intent */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Meeting new people?</h2>
            <p className="mb-4 text-sm text-slate-500">
              Are you open to social events where you might meet new people?
            </p>
            <div className="space-y-2">
              {SOCIAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDetailedPrefs((prev) => ({ ...prev, socialIntent: option.value }))}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    detailedPrefs.socialIntent === option.value
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-slate-500">{option.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Budget */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Budget</h2>
            <p className="mb-4 text-sm text-slate-500">
              What&apos;s your typical budget per event?
            </p>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((budget) => (
                <button
                  key={budget.value}
                  onClick={() => setDetailedPrefs((prev) => ({ ...prev, budget: budget.value }))}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    detailedPrefs.budget === budget.value
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {budget.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-8">
          {/* Preferred Days */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Preferred Days</h2>
            <p className="mb-4 text-sm text-slate-500">
              When do you usually like to go out? Select all that apply.
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    constraints.preferredDays.includes(day.value)
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </section>

          {/* Preferred Times */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Preferred Times</h2>
            <p className="mb-4 text-sm text-slate-500">
              What time of day do you prefer for events?
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TIMES.map((time) => (
                <button
                  key={time.value}
                  onClick={() => toggleTime(time.value)}
                  className={`rounded-lg p-3 text-center transition ${
                    constraints.preferredTimes.includes(time.value)
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <div className="font-medium">{time.label}</div>
                  <div className={`text-xs ${constraints.preferredTimes.includes(time.value) ? "text-white/80" : "text-slate-500"}`}>
                    {time.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Home Neighborhood */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Home Neighborhood</h2>
            <p className="mb-4 text-sm text-slate-500">
              Where are you based? We&apos;ll prioritize events nearby.
            </p>
            <select
              value={constraints.homeNeighborhood || ""}
              onChange={(e) => setConstraints((prev) => ({
                ...prev,
                homeNeighborhood: e.target.value || null
              }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a neighborhood</option>
              {DENVER_NEIGHBORHOODS.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </option>
              ))}
            </select>
          </section>

          {/* Favorite Neighborhoods */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Favorite Neighborhoods</h2>
            <p className="mb-4 text-sm text-slate-500">
              Select neighborhoods you&apos;d like to explore.
            </p>
            <div className="flex flex-wrap gap-2">
              {DENVER_NEIGHBORHOODS.map((neighborhood) => (
                <button
                  key={neighborhood}
                  onClick={() => toggleNeighborhood(neighborhood)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    constraints.neighborhoods.includes(neighborhood)
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {neighborhood}
                </button>
              ))}
            </div>
          </section>

          {/* Travel Radius */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">Travel Distance</h2>
            <p className="mb-4 text-sm text-slate-500">
              How far are you willing to travel for events?
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={constraints.travelRadius || 0}
                onChange={(e) => setConstraints((prev) => ({
                  ...prev,
                  travelRadius: parseInt(e.target.value) || null
                }))}
                className="flex-1"
              />
              <span className="w-24 text-right text-sm text-slate-600">
                {constraints.travelRadius ? `${constraints.travelRadius} miles` : "No limit"}
              </span>
            </div>
          </section>

          {/* Discovery Options */}
          <section className="space-y-4">
            <h2 className="mb-2 text-lg font-semibold">Discovery Options</h2>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-primary/50">
              <div>
                <div className="font-medium">Free Events Only</div>
                <div className="text-sm text-slate-500">Only show events that are free</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.freeEventsOnly}
                onChange={(e) => setConstraints((prev) => ({ ...prev, freeEventsOnly: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-primary/50">
              <div>
                <div className="font-medium">Discovery Mode</div>
                <div className="text-sm text-slate-500">Show more variety and surprise picks</div>
              </div>
              <input
                type="checkbox"
                checked={constraints.discoveryMode}
                onChange={(e) => setConstraints((prev) => ({ ...prev, discoveryMode: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
          </section>
        </div>
      )}

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {success && (
            <span className="text-sm font-medium text-green-600">
              Saved!
            </span>
          )}
          {error && (
            <span className="text-sm font-medium text-red-600">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
