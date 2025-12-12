import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PlaceDetailClient from "./PlaceDetailClient";

interface PlaceDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PlaceDetailPageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    select: { name: true, neighborhood: true },
  });

  if (!place) {
    return { title: "Place Not Found | Pulse" };
  }

  return {
    title: `${place.name} | Pulse`,
    description: `Discover ${place.name}${place.neighborhood ? ` in ${place.neighborhood}` : ""} on Pulse`,
  };
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  // Get place from Place model
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    include: {
      events: {
        where: {
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      },
    },
  });

  if (!place) {
    notFound();
  }

  // Check if user has notification set
  const userAlert = await prisma.newPlaceAlert.findFirst({
    where: {
      userId: session.user.id,
      placeId: place.id,
    },
  });

  // Get similar places for recommendations
  const similarPlaces = await prisma.place.findMany({
    where: {
      id: { not: place.id },
      category: place.category,
      openingStatus: "OPEN",
    },
    take: 6,
    orderBy: { googleRating: "desc" },
  });

  return (
    <PlaceDetailClient
      place={place}
      hasNotification={!!userAlert}
      userId={session.user.id}
      similarPlaces={similarPlaces}
    />
  );
}
