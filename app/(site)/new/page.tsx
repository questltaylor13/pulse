import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewPlacesClient from "./NewPlacesClient";

export const metadata = {
  title: "What's New in Denver | Pulse",
  description: "Discover newly opened restaurants, bars, and upcoming venues in Denver",
};

async function getNewAndUpcomingPlaces() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get all relevant places in parallel
  const [justOpened, recentlyOpened, softOpen, comingSoon, announced] = await Promise.all([
    // Just Opened (last 30 days)
    prisma.place.findMany({
      where: {
        openingStatus: "OPEN",
        OR: [
          { openedDate: { gte: thirtyDaysAgo } },
          { isNew: true, openedDate: { gte: thirtyDaysAgo } },
        ],
      },
      orderBy: { openedDate: "desc" },
      take: 20,
    }),

    // Recently Opened (30-90 days)
    prisma.place.findMany({
      where: {
        openingStatus: "OPEN",
        openedDate: {
          gte: ninetyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
      orderBy: { openedDate: "desc" },
      take: 20,
    }),

    // Soft Open
    prisma.place.findMany({
      where: { openingStatus: "SOFT_OPEN" },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),

    // Coming Soon (with expected date)
    prisma.place.findMany({
      where: {
        openingStatus: "COMING_SOON",
        expectedOpenDate: { not: null },
      },
      orderBy: { expectedOpenDate: "asc" },
      take: 20,
    }),

    // Announced (coming soon without date, or rumored)
    prisma.place.findMany({
      where: {
        openingStatus: "COMING_SOON",
        expectedOpenDate: null,
      },
      orderBy: { announcedDate: "desc" },
      take: 10,
    }),
  ]);

  return {
    justOpened,
    recentlyOpened,
    softOpen,
    comingSoon,
    announced,
  };
}

export default async function NewPlacesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  const { justOpened, recentlyOpened, softOpen, comingSoon, announced } =
    await getNewAndUpcomingPlaces();

  return (
    <NewPlacesClient
      justOpened={justOpened}
      recentlyOpened={recentlyOpened}
      softOpen={softOpen}
      comingSoon={comingSoon}
      announced={announced}
    />
  );
}
