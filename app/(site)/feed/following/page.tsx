import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSocialV1Enabled } from "@/lib/ranking/flags";
import { fetchSuggestedTastemakers } from "@/lib/social/suggestions";
import FollowingFeed from "@/components/social/FollowingFeed";

// Wave 5 — what the people you trust are ranking. Replaces the redirect stub
// left by the old /feed → / migration.
//
// The feed body is a client infinite-scroll over /api/feed/following; the
// suggestions are fetched here, server-side, so the empty state renders with
// real people in it on first paint rather than after a second round trip.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Following · Pulse",
  description: "What the people you follow are ranking.",
};

export default async function FollowingFeedPage() {
  // Flag off ⇒ the pre-Wave-5 behaviour (redirect to home) is preserved exactly.
  if (!isSocialV1Enabled()) redirect("/");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const [followCount, suggestions] = await Promise.all([
    prisma.userFollow.count({ where: { followerId: session.user.id } }),
    fetchSuggestedTastemakers(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Following</h1>
        <p className="mt-1 text-sm text-mute">
          What the people you trust are ranking. Their lists update as they rate.
        </p>
      </header>

      <FollowingFeed suggestions={suggestions} hasFollows={followCount > 0} />
    </div>
  );
}
