import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function FeedPlaceholder() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const preferenceCount = await prisma.preference.count({ where: { userId: session.user.id } });
  if (preferenceCount === 0) {
    redirect("/onboarding");
  }

  return (
    <section className="card">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Upcoming feed</h2>
        <p className="text-slate-700">
          The personalized event feed will live here. Next steps include connecting user preferences, city context, and
          interactions to surface the best matches in Denver.
        </p>
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Draft API endpoints and server actions will power fetching events within the next 14 days and scoring them based on
          the Prisma schema.
        </div>
      </div>
    </section>
  );
}
