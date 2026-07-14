import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { similarPlaces } from "@/lib/detail/similar";
import { isSituationsV1Enabled } from "@/lib/ranking/flags";
import PlaceDetailPage from "@/components/detail/PlaceDetailPage";
import DetailFeedback from "@/components/feedback/DetailFeedback";
import PlaceRating from "@/components/feedback/PlaceRating";
import RateBlock from "@/components/rank/RateBlock";
import { getFeedbackMaps } from "@/lib/feedback/server";
import { fetchEntryForRef } from "@/lib/rank-engine/service";
import { isRateRankEnabled } from "@/lib/ranking/flags";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    select: { name: true, neighborhood: true },
  });

  if (!place) return { title: "Place Not Found | Pulse" };

  return {
    title: `${place.name} | Pulse`,
    description: `Discover ${place.name}${place.neighborhood ? ` in ${place.neighborhood}` : ""} on Pulse`,
  };
}

export default async function PlacePage({ params }: PageProps) {
  const place = await prisma.place.findUnique({
    where: { id: params.id },
    include: {
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          imageUrl: true,
          startTime: true,
        },
      },
    },
  });

  if (!place) notFound();

  const similar = await similarPlaces(place.id, 3);

  // PRD 5 Phase 3 — fetch user's current feedback on this place.
  const session = await getServerSession(authOptions);
  const { byPlaceId } = await getFeedbackMaps({
    userId: session?.user?.id,
    placeIds: [place.id],
  });
  const feedbackStatus = byPlaceId.get(place.id) ?? null;

  // Wave 2 Beli — this user's own rating + the place's aggregate.
  const myStatus = session?.user?.id
    ? await prisma.userItemStatus.findUnique({
        where: { userId_placeId: { userId: session.user.id, placeId: place.id } },
        select: { rating: true },
      })
    : null;
  const ratingAvg =
    place.pulseRatingCount > 0 ? place.pulseRatingSum / place.pulseRatingCount : null;

  // Wave 4 Rate & Rank — the sentiment/duel flow replaces the star card.
  const rateRankOn = isRateRankEnabled();
  const rankEntry =
    rateRankOn && session?.user?.id
      ? await fetchEntryForRef(session.user.id, { placeId: place.id })
      : null;

  return (
    <>
      <div className="mx-auto flex max-w-3xl justify-end px-5 pt-3">
        <DetailFeedback
          ref_={{ placeId: place.id }}
          itemTitle={place.name}
          shareUrl={`/places/${place.id}`}
          initialStatus={feedbackStatus}
        />
      </div>
      <div className="mx-auto max-w-3xl px-5 pt-3">
        {rateRankOn ? (
          <RateBlock
            refObj={{ placeId: place.id }}
            itemTitle={place.name}
            itemImageUrl={place.primaryImageUrl}
            prompt="Been here? Rate it"
            entry={rankEntry}
            aggregate={{ avg: ratingAvg, count: place.pulseRatingCount }}
            legacyRating={myStatus?.rating ?? null}
          />
        ) : (
          <PlaceRating
            placeId={place.id}
            initialRating={myStatus?.rating ?? null}
            ratingCount={place.pulseRatingCount}
            ratingAvg={ratingAvg}
          />
        )}
      </div>
      <PlaceDetailPage
      place={{
        id: place.id,
        name: place.name,
        address: place.address,
        neighborhood: place.neighborhood,
        category: place.category,
        primaryImageUrl: place.primaryImageUrl,
        priceLevel: place.priceLevel,
        vibeTags: place.vibeTags,
        pulseDescription: place.pulseDescription,
        googleMapsUrl: place.googleMapsUrl,
        phoneNumber: place.phoneNumber,
        website: place.website,
        openingHours: place.openingHours,
        lat: place.lat,
        lng: place.lng,
        // Wave 6B — gated server-side. PlaceDetailPage is a client component, so
        // it cannot read the flag; withholding the values is the gate. Until the
        // enrichment backfill runs every boolean is false anyway.
        ...(isSituationsV1Enabled()
          ? {
              goodForWatchingSports: place.goodForWatchingSports,
              isKidFriendly: place.isKidFriendly,
              hasOutdoorSeating: place.hasOutdoorSeating,
              hasIndoorSeating: place.hasIndoorSeating,
              fitsLargeGroups: place.fitsLargeGroups,
              isDogFriendly: place.isDogFriendly,
              isDrinkingOptional: place.isDrinkingOptional,
              hasMocktailMenu: place.hasMocktailMenu,
            }
          : {}),
      }}
      upcomingEvents={place.events}
      similarPlaces={similar}
    />
    </>
  );
}
