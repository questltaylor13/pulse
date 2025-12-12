import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category, PreferenceType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const INTERESTS: { key: Category; label: string; description: string }[] = [
  { key: Category.ART, label: "Art & galleries", description: "Openings, exhibits, and creative showcases." },
  { key: Category.LIVE_MUSIC, label: "Live music & concerts", description: "Shows, intimate sets, and festivals." },
  { key: Category.BARS, label: "Bars & nightlife", description: "Lounges, speakeasies, and late-night spots." },
  { key: Category.FOOD, label: "Food & restaurants", description: "Tasty dinners, pop-ups, and chef specials." },
  { key: Category.COFFEE, label: "Coffee shops", description: "Cafe hangs, latte art, and morning meetups." },
  { key: Category.OUTDOORS, label: "Outdoors & hikes", description: "Trails, parks, and fresh air escapes." },
  { key: Category.FITNESS, label: "Fitness & wellness", description: "Studios, yoga, and community workouts." },
  { key: Category.SEASONAL, label: "Seasonal / pop-up events", description: "Markets, festivals, and limited-time fun." },
];

const intensityMap: Record<string, { preferenceType: PreferenceType; intensity: number }> = {
  love: { preferenceType: PreferenceType.LIKE, intensity: 5 },
  like: { preferenceType: PreferenceType.LIKE, intensity: 3 },
  dislike: { preferenceType: PreferenceType.DISLIKE, intensity: 1 },
};

async function saveInterests(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userId = session!.user.id;
  const selections = INTERESTS.map((interest) => {
    const choice = formData.get(interest.key) as string | null;
    return { interest, choice };
  });

  const preferences = selections
    .filter((selection) => selection.choice && intensityMap[selection.choice])
    .map((selection) => ({
      userId,
      category: selection.interest.key,
      preferenceType: intensityMap[selection.choice!].preferenceType,
      intensity: intensityMap[selection.choice!].intensity,
    }));

  if (preferences.length === 0) {
    redirect("/onboarding/interests");
  }

  await prisma.$transaction([
    prisma.preference.deleteMany({ where: { userId } }),
    prisma.preference.createMany({ data: preferences }),
  ]);

  redirect("/onboarding/summary");
}

export default async function InterestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const existingPreferences = await prisma.preference.findMany({
    where: { userId: session.user.id },
  });

  const existingSelections = existingPreferences.reduce<Record<Category, string>>((acc, pref) => {
    if (pref.preferenceType === PreferenceType.DISLIKE) {
      acc[pref.category] = "dislike";
      return acc;
    }

    acc[pref.category] = pref.intensity >= 5 ? "love" : "like";
    return acc;
  }, {} as Record<Category, string>);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Step 2 of 3</p>
        <h1 className="text-3xl font-semibold text-slate-900">Pick your Denver interests</h1>
        <p className="text-slate-600">Choose how much each vibe speaks to you.</p>
      </div>

      <form action={saveInterests} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {INTERESTS.map((interest) => (
            <div key={interest.key} className="card space-y-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900">{interest.label}</h3>
                <p className="text-sm text-slate-600">{interest.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { label: "Love it", value: "love" },
                    { label: "Like it", value: "like" },
                    { label: "Not my thing", value: "dislike" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition hover:border-primary ${
                      existingSelections[interest.key] === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={interest.key}
                      value={option.value}
                      required
                      defaultChecked={existingSelections[interest.key] === option.value}
                      className="h-4 w-4 accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <a href="/onboarding" className="btn-secondary">
            Back
          </a>
          <button type="submit" className="btn-primary">
            Save and review
          </button>
        </div>
      </form>
    </section>
  );
}
