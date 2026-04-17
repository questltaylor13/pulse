import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InfluencerProfileClient from "./InfluencerProfileClient";

interface InfluencerPageProps {
  params: { handle: string };
}

export default async function InfluencerPage({ params }: InfluencerPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (!session.user.onboardingComplete) {
    redirect("/onboarding");
  }

  // Fetch influencer with all data
  const influencer = await prisma.influencer.findUnique({
    where: { handle: params.handle },
    include: {
      _count: {
        select: { followers: true },
      },
      pickSets: {
        where: {
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
        include: {
          picks: {
            orderBy: { rank: "asc" },
            include: {
              item: {
                select: {
                  id: true,
                  type: true,
                  title: true,
                  description: true,
                  category: true,
                  tags: true,
                  venueName: true,
                  address: true,
                  startTime: true,
                  priceRange: true,
                  neighborhood: true,
                },
              },
            },
          },
        },
      },
      eventFeatures: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              venueName: true,
              address: true,
              neighborhood: true,
              startTime: true,
              endTime: true,
              priceRange: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!influencer) {
    notFound();
  }

  // Check if user follows this influencer
  const userFollow = await prisma.userInfluencerFollow.findUnique({
    where: {
      userId_influencerId: {
        userId: session.user.id,
        influencerId: influencer.id,
      },
    },
  });

  // Format the data for the client component
  const formattedInfluencer = {
    id: influencer.id,
    handle: influencer.handle,
    displayName: influencer.displayName,
    bio: influencer.bio,
    profileImageUrl: influencer.profileImageUrl,
    profileColor: influencer.profileColor,
    instagram: influencer.instagram,
    tiktok: influencer.tiktok,
    isDenverNative: influencer.isDenverNative,
    yearsInDenver: influencer.yearsInDenver,
    isFounder: influencer.isFounder,
    vibeDescription: influencer.vibeDescription,
    funFacts: influencer.funFacts,
    specialties: influencer.specialties,
    preferredCategories: influencer.preferredCategories,
    followerCount: influencer._count.followers,
    isFollowed: !!userFollow,
    pickSets: influencer.pickSets.map((set) => ({
      id: set.id,
      range: set.range,
      title: set.title,
      summaryText: set.summaryText,
      generatedAt: set.generatedAt,
      picks: set.picks.map((pick) => ({
        id: pick.id,
        rank: pick.rank,
        reason: pick.reason,
        item: {
          id: pick.item.id,
          type: pick.item.type,
          title: pick.item.title,
          description: pick.item.description,
          category: pick.item.category,
          tags: pick.item.tags,
          venueName: pick.item.venueName,
          address: pick.item.address,
          startTime: pick.item.startTime,
          priceRange: pick.item.priceRange,
          neighborhood: pick.item.neighborhood,
        },
      })),
    })),
    eventFeatures: influencer.eventFeatures.map((feature) => ({
      id: feature.id,
      quote: feature.quote,
      isHost: feature.isHost,
      isFeatured: feature.isFeatured,
      event: {
        id: feature.event.id,
        title: feature.event.title,
        description: feature.event.description,
        category: feature.event.category,
        venueName: feature.event.venueName,
        address: feature.event.address,
        neighborhood: feature.event.neighborhood,
        startTime: feature.event.startTime,
        endTime: feature.event.endTime,
        priceRange: feature.event.priceRange,
        imageUrl: feature.event.imageUrl,
      },
    })),
  };

  return <InfluencerProfileClient influencer={formattedInfluencer} />;
}
