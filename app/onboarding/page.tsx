import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DenverTenure, RelationshipStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const OPTIONS: { value: RelationshipStatus; title: string; description: string }[] = [
  {
    value: RelationshipStatus.SINGLE,
    title: "Mostly solo / with friends",
    description: "Find happenings perfect for exploring Denver on your own or with pals.",
  },
  {
    value: RelationshipStatus.COUPLE,
    title: "Mostly as a couple / date nights",
    description: "Curate date night ideas and couple-friendly vibes around the city.",
  },
];

const TENURE_OPTIONS: { value: DenverTenure; title: string; description: string }[] = [
  {
    value: DenverTenure.NEW_TO_DENVER,
    title: "I'm brand new here (0–6 months)",
    description: "Fresh to Denver and ready to explore.",
  },
  {
    value: DenverTenure.ONE_TO_TWO_YEARS,
    title: "1–2 years",
    description: "You've got a few favorite spots and want more.",
  },
  {
    value: DenverTenure.TWO_TO_FIVE_YEARS,
    title: "2–5 years",
    description: "Comfortable around town and looking for new gems.",
  },
  {
    value: DenverTenure.FIVE_PLUS_YEARS,
    title: "5+ years (seasoned Denverite)",
    description: "You know the drill—let's keep it fresh.",
  },
];

async function saveRelationshipStatus(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const relationshipStatus = formData.get("relationshipStatus") as RelationshipStatus | null;
  const denverTenure = formData.get("denverTenure") as DenverTenure | null;

  if (!relationshipStatus || !denverTenure) {
    redirect("/onboarding");
  }

  await prisma.user.update({
    where: { id: session!.user.id },
    data: { relationshipStatus, denverTenure, citySlug: "denver" },
  });

  redirect("/onboarding/interests");
}

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [user, preferenceCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.preference.count({ where: { userId: session.user.id } }),
  ]);

  if (preferenceCount > 0) {
    redirect("/feed");
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Step 1 of 3</p>
        <h1 className="text-3xl font-semibold text-slate-900">Tell us about your Denver vibe</h1>
        <p className="text-slate-600">We will tailor Pulse recommendations for Denver based on how you explore the city.</p>
      </div>

      <form action={saveRelationshipStatus} className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">How are you mostly using Pulse?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {OPTIONS.map((option) => (
              <label
                key={option.value}
                className="card flex cursor-pointer flex-col gap-3 border-2 border-transparent hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{option.title}</div>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                  <input
                    type="radio"
                    name="relationshipStatus"
                    value={option.value}
                    defaultChecked={user?.relationshipStatus === option.value}
                    required
                    className="h-5 w-5 cursor-pointer accent-primary"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">How long have you been in Denver?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {TENURE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="card flex cursor-pointer flex-col gap-3 border-2 border-transparent hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{option.title}</div>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                  <input
                    type="radio"
                    name="denverTenure"
                    value={option.value}
                    defaultChecked={user?.denverTenure === option.value}
                    required
                    className="h-5 w-5 cursor-pointer accent-primary"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary w-full md:w-auto">
            Continue to interests
          </button>
        </div>
      </form>
    </section>
  );
}
