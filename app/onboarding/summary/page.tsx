import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Category, PreferenceType, RelationshipStatus } from "@prisma/client";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const LABELS: Record<Category, string> = {
  [Category.ART]: "Art & galleries",
  [Category.LIVE_MUSIC]: "Live music & concerts",
  [Category.BARS]: "Bars & nightlife",
  [Category.FOOD]: "Food & restaurants",
  [Category.COFFEE]: "Coffee shops",
  [Category.OUTDOORS]: "Outdoors & hikes",
  [Category.FITNESS]: "Fitness & wellness",
  [Category.SEASONAL]: "Seasonal / pop-up events",
  [Category.POPUP]: "Seasonal / pop-up events",
  [Category.OTHER]: "Other",
  [Category.RESTAURANT]: "Restaurants & dining",
  [Category.ACTIVITY_VENUE]: "Activities & venues",
};

const relationshipCopy: Record<RelationshipStatus, string> = {
  [RelationshipStatus.SINGLE]: "Mostly solo / with friends",
  [RelationshipStatus.COUPLE]: "Mostly as a couple / date nights",
};

export default async function SummaryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const [user, preferences] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.preference.findMany({ where: { userId: session.user.id } }),
  ]);

  if (!preferences.length) {
    redirect("/onboarding/interests");
  }

  const grouped = {
    love: preferences.filter((pref) => pref.preferenceType === PreferenceType.LIKE && pref.intensity >= 5),
    like: preferences.filter((pref) => pref.preferenceType === PreferenceType.LIKE && pref.intensity < 5),
    dislike: preferences.filter((pref) => pref.preferenceType === PreferenceType.DISLIKE),
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary">Summary</p>
        <h1 className="text-3xl font-semibold text-slate-900">Ready for your recommendations</h1>
        <p className="text-slate-600">Here is how we will start tailoring Denver picks for you.</p>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-medium text-slate-700">You’re exploring Denver mostly as</p>
        <p className="text-lg font-semibold text-slate-900">
          {user?.relationshipStatus ? relationshipCopy[user.relationshipStatus] : "Not set"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PreferenceList title="Love it" items={grouped.love} />
        <PreferenceList title="Like it" items={grouped.like} />
        <PreferenceList title="Not my thing" items={grouped.dislike} />
      </div>

      <div className="flex justify-end">
        <Link href="/feed" className="btn-primary">
          Finish and view your recommendations
        </Link>
      </div>
    </section>
  );
}

function PreferenceList({
  title,
  items,
}: {
  title: string;
  items: { id: string; category: Category }[];
}) {
  return (
    <div className="card space-y-2">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {items.length ? (
        <ul className="space-y-2 text-sm text-slate-700">
          {items.map((pref) => (
            <li key={pref.id}>{LABELS[pref.category]}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nothing here yet.</p>
      )}
    </div>
  );
}
